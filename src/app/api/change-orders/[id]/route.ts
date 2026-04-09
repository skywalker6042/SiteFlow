import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const { approved } = await req.json()

  const [prev] = await sql`SELECT * FROM change_orders WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  const [co] = await sql`
    UPDATE change_orders SET approved = ${approved}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `

  if (prev && prev.approved !== approved) {
    const [job] = await sql`SELECT name FROM jobs WHERE id = ${co.job_id}`
    await logActivity({
      orgId: user.effectiveOrgId!,
      actorEmail: user.email,
      entityType: 'change_order',
      entityId: id,
      entityName: co.description,
      action: approved ? 'approved' : 'unapproved',
      metadata: { job_id: co.job_id, job_name: job?.name, amount: Number(co.amount) },
    })
  }

  return NextResponse.json(co)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`DELETE FROM change_orders WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return new NextResponse(null, { status: 204 })
}
