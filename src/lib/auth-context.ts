import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { UserPermissions } from '@/lib/permissions'
import { ALL_FEATURES, DEFAULT_PLAN_FEATURES, type FeatureKey, type PlanTier } from '@/lib/plan-features'

export const ACTIVE_ORG_COOKIE = 'siteflow_active_org'

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * Returns the effective org ID for the current request.
 * - Org users: always their own orgId from session
 * - Platform admin: active_org cookie if set, throws otherwise
 */
export async function getOrgId(): Promise<string> {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthenticated')

  if (session.user.platformRole === 'admin') {
    const cookieStore = await cookies()
    const activeOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
    if (!activeOrg) throw new Error('No active org context')
    return activeOrg
  }

  if (!session.user.orgId) throw new Error('No org membership')
  return session.user.orgId
}

/**
 * Returns the full session user with `effectiveOrgId` resolved.
 * - Org users: effectiveOrgId === orgId
 * - Platform admin: effectiveOrgId === active_org cookie value (or null)
 */
export async function getSessionUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthenticated')

  const user = session.user
  let effectiveOrgId: string | null = user.orgId

  if (user.platformRole === 'admin') {
    const cookieStore = await cookies()
    effectiveOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null
  }

  return { ...user, effectiveOrgId }
}

/**
 * Returns the full session user with orgId guaranteed non-null.
 * Use in org-scoped API routes. Throws if unauthenticated or no org membership.
 */
export async function getOrgUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthenticated')
  if (!session.user.orgId) throw new Error('No org membership')
  return session.user as typeof session.user & { orgId: string; role: 'owner' | 'worker' }
}

/** Asserts the user is a platform admin. Returns the user or throws 403. */
export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthenticated')
  if (session.user.platformRole !== 'admin') throw new Error('Forbidden')
  return session.user
}

/** Asserts the user is an owner (or platform admin in org context). Throws 403 otherwise. */
export async function requireOwner() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthenticated')
  if (session.user.role !== 'owner' && session.user.platformRole !== 'admin') {
    throw new Error('Forbidden')
  }
  return session.user
}

/** Returns permissions for the current user. Safe — returns all-false if no session. */
export async function getPermissions(): Promise<UserPermissions> {
  const session = await auth()
  const { DEFAULT_WORKER_PERMISSIONS } = await import('@/lib/permissions')
  return session?.user?.permissions ?? DEFAULT_WORKER_PERMISSIONS
}

/** Returns active org context info for admin banner. Null if not in org context. */
export async function getAdminOrgContext(): Promise<{ orgId: string; orgName: string } | null> {
  const session = await auth()
  if (!session?.user || session.user.platformRole !== 'admin') return null

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
  if (!activeOrgId) return null

  // Import sql lazily to avoid circular deps
  const { default: sql } = await import('@/lib/db')
  const [org] = await sql`SELECT id, name FROM organizations WHERE id = ${activeOrgId}`
  if (!org) return null

  return { orgId: org.id, orgName: org.name }
}

/**
 * Returns the enabled features for the current user's org.
 * Platform admins always get ALL_FEATURES.
 * Falls back to DEFAULT_PLAN_FEATURES if nothing is configured in the DB.
 */
export async function getEnabledFeatures(): Promise<FeatureKey[]> {
  const session = await auth()
  if (!session?.user) return ALL_FEATURES

  // Admins in org context always see everything
  if (session.user.platformRole === 'admin') return ALL_FEATURES

  const orgId = session.user.orgId
  if (!orgId) return ALL_FEATURES

  const { default: sql } = await import('@/lib/db')
  try {
    const [org] = await sql`SELECT plan FROM organizations WHERE id = ${orgId}` as any[]
    const plan = ((org?.plan ?? 'trial') as PlanTier)
    await sql`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    const [row] = await sql`SELECT value FROM platform_settings WHERE key = ${'plan_features_' + plan}` as any[]
    if (row?.value) return JSON.parse(row.value) as FeatureKey[]
    return DEFAULT_PLAN_FEATURES[plan]
  } catch {
    return ALL_FEATURES
  }
}

// ─── API response helpers ─────────────────────────────────────────────────────

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── Wrapped auth guard for API routes ───────────────────────────────────────

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Wraps an API handler with auth + optional owner-only enforcement.
 * Usage:
 *   export const GET = withAuth(async (req, ctx, user) => { ... })
 *   export const DELETE = withAuth(async (req, ctx, user) => { ... }, { ownerOnly: true })
 */
export function withAuth<T extends RouteContext>(
  handler: (req: Request, ctx: T, user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<NextResponse>,
  opts: { ownerOnly?: boolean; permission?: keyof UserPermissions } = {}
) {
  return async (req: Request, ctx: T): Promise<NextResponse> => {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const user = session.user
    if (opts.ownerOnly && user.role !== 'owner' && user.platformRole !== 'admin') {
      return forbidden()
    }
    if (opts.permission && !user.permissions[opts.permission]) {
      return forbidden()
    }

    const cookieStore = await cookies()
    let effectiveOrgId: string | null = user.orgId
    if (user.platformRole === 'admin') {
      effectiveOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null
    }

    return handler(req, ctx, { ...user, effectiveOrgId })
  }
}
