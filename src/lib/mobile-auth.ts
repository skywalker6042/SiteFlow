import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'crypto'
import sql from '@/lib/db'
import type { AppUser } from '@/lib/auth'
import type { UserPermissions } from '@/lib/permissions'

const MOBILE_SESSION_COOKIE = 'siteflow_mobile_session'
const MOBILE_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

type MobileSessionRow = {
  mobile_session_id: string
  user_id: string
  session_token_hash: string
  expires_at: string
}

type MobileSessionUserRow = {
  id: string
  email: string
  platform_role: 'admin' | 'support' | 'org_user'
  org_id: string | null
  role: 'owner' | 'worker' | null
  permissions: UserPermissions | null
  worker_id: string | null
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function ensureMobileSessionTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mobile_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS mobile_sessions_user_id_idx ON mobile_sessions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS mobile_sessions_expires_at_idx ON mobile_sessions(expires_at)`
}

export async function createMobileSession(userId: string) {
  await ensureMobileSessionTable()

  const rawToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + MOBILE_SESSION_TTL_MS).toISOString()

  await sql`
    INSERT INTO mobile_sessions (user_id, session_token_hash, expires_at)
    VALUES (${userId}, ${hashToken(rawToken)}, ${expiresAt})
  `

  const cookieStore = await cookies()
  cookieStore.set(MOBILE_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export async function clearMobileSession() {
  await ensureMobileSessionTable()

  const cookieStore = await cookies()
  const rawToken = cookieStore.get(MOBILE_SESSION_COOKIE)?.value

  if (rawToken) {
    await sql`DELETE FROM mobile_sessions WHERE session_token_hash = ${hashToken(rawToken)}`
  }

  cookieStore.set(MOBILE_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  })
}

export async function getMobileSessionUser(): Promise<AppUser | null> {
  await ensureMobileSessionTable()

  const cookieStore = await cookies()
  const rawToken = cookieStore.get(MOBILE_SESSION_COOKIE)?.value
  if (!rawToken) return null

  const rows = await sql`
    SELECT
      ms.id AS mobile_session_id,
      ms.user_id,
      ms.session_token_hash,
      ms.expires_at,
      u.email,
      u.platform_role,
      om.org_id,
      om.role,
      om.permissions,
      om.worker_id
    FROM mobile_sessions ms
    JOIN users u ON u.id = ms.user_id
    LEFT JOIN org_members om ON om.user_id = u.id
    WHERE ms.session_token_hash = ${hashToken(rawToken)}
    ORDER BY
      CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END,
      om.created_at ASC
    LIMIT 1
  ` as unknown as Array<MobileSessionRow & MobileSessionUserRow>

  const row = rows[0]
  if (!row) {
    await clearMobileSession()
    return null
  }

  if (new Date(row.expires_at) <= new Date()) {
    await sql`DELETE FROM mobile_sessions WHERE id = ${row.mobile_session_id}`
    await clearMobileSession()
    return null
  }

  return {
    id: row.user_id,
    email: row.email,
    platformRole: row.platform_role,
    orgId: row.org_id ?? null,
    role: row.role ?? null,
    permissions: (row.permissions ?? {}) as UserPermissions,
    workerId: row.worker_id ?? null,
  }
}
