import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ userId: string }> }

// PATCH /api/org-members/:userId  { permissions: Partial<UserPermissions> }
// Owner-only: update permission flags for a crew member's account
export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { userId } = await params
  const { permissions } = await req.json()

  // Merge partial permissions into existing JSONB using || operator
  const [member] = await sql`
    UPDATE org_members
    SET permissions = permissions || ${JSON.stringify(permissions)}::jsonb
    WHERE user_id = ${userId} AND org_id = ${user.effectiveOrgId}
    RETURNING user_id, role, permissions
  `
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  return NextResponse.json(member)
}

// GET /api/org-members  — list all members in the org with their permissions
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { userId } = await params
  const [member] = await sql`
    SELECT om.user_id, om.role, om.permissions, om.worker_id,
           u.email
    FROM org_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.user_id = ${userId} AND om.org_id = ${user.effectiveOrgId}
  `
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(member)
}
