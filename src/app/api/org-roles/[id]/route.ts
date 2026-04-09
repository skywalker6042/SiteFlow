import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden, unauthorized } from '@/lib/auth-context'
import type { UserPermissions } from '@/lib/permissions'

interface Ctx { params: Promise<{ id: string }> }

// PATCH — update role name, color, or permissions
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  const orgId = user.effectiveOrgId
  if (!orgId) return forbidden()

  const { id } = await params
  const { name, color, permissions } = await req.json() as {
    name?: string; color?: string; permissions?: UserPermissions
  }

  const [role] = await sql`
    UPDATE org_roles
    SET
      name        = COALESCE(${name?.trim() ?? null}, name),
      color       = COALESCE(${color ?? null}, color),
      permissions = COALESCE(${permissions ? sql.json(permissions as unknown as Parameters<typeof sql.json>[0]) : null}, permissions)
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(role)
}

// DELETE — delete a role (workers keep their current permissions snapshot)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  const orgId = user.effectiveOrgId
  if (!orgId) return forbidden()

  const { id } = await params
  await sql`DELETE FROM org_roles WHERE id = ${id} AND org_id = ${orgId}`
  return new NextResponse(null, { status: 204 })
}
