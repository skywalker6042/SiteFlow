import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden, unauthorized } from '@/lib/auth-context'
import { LEAD_CREW_PERMISSIONS, BASIC_CREW_PERMISSIONS } from '@/lib/permissions'
import type { UserPermissions } from '@/lib/permissions'

// Ensure the org_roles table exists
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS org_roles (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#6b7280',
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Add org_role_id to org_members if not present
  await sql`
    ALTER TABLE org_members
    ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL
  `
}

// GET — list roles for org (auto-seeds presets if none exist)
export async function GET(_req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const orgId = user.effectiveOrgId
  if (!orgId) return forbidden()

  await ensureTable()

  // Seed presets if this org has no roles yet
  const existing = await sql`SELECT id FROM org_roles WHERE org_id = ${orgId} LIMIT 1`
  if (existing.length === 0) {
    await sql`
      INSERT INTO org_roles (org_id, name, color, permissions) VALUES
        (${orgId}, 'Lead Crew',   '#f97316', ${sql.json(LEAD_CREW_PERMISSIONS  as unknown as Parameters<typeof sql.json>[0])}),
        (${orgId}, 'Basic Crew',  '#6b7280', ${sql.json(BASIC_CREW_PERMISSIONS as unknown as Parameters<typeof sql.json>[0])})
    `
  }

  const roles = await sql`
    SELECT * FROM org_roles WHERE org_id = ${orgId} ORDER BY name
  `
  return NextResponse.json(roles)
}

// POST — create a new role
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  const orgId = user.effectiveOrgId
  if (!orgId) return forbidden()

  await ensureTable()

  const { name, color, permissions } = await req.json() as {
    name: string; color: string; permissions: UserPermissions
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const [role] = await sql`
    INSERT INTO org_roles (org_id, name, color, permissions)
    VALUES (${orgId}, ${name.trim()}, ${color ?? '#6b7280'}, ${sql.json(permissions as unknown as Parameters<typeof sql.json>[0])})
    RETURNING *
  `
  return NextResponse.json(role, { status: 201 })
}
