import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden, unauthorized } from '@/lib/auth-context'

interface Ctx { params: Promise<{ id: string }> }

// PUT — assign (or clear) a role for a worker
// Body: { role_id: string | null }
// Copies the role's permissions snapshot into org_members.permissions
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  const orgId = user.effectiveOrgId
  if (!orgId) return forbidden()

  const { id: workerId } = await params
  const { role_id } = await req.json() as { role_id: string | null }

  if (role_id) {
    // Look up the role and copy its permissions
    const [role] = await sql`
      SELECT permissions FROM org_roles WHERE id = ${role_id} AND org_id = ${orgId}
    `
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    await sql`
      UPDATE org_members
      SET org_role_id = ${role_id}, permissions = ${sql.json(role.permissions)}
      WHERE worker_id = ${workerId} AND org_id = ${orgId}
    `
  } else {
    // Clear the role assignment (keep existing permissions)
    await sql`
      UPDATE org_members
      SET org_role_id = NULL
      WHERE worker_id = ${workerId} AND org_id = ${orgId}
    `
  }

  return new NextResponse(null, { status: 204 })
}
