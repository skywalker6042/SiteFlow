import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { job_id, description, amount } = await req.json()
  const [job] = await sql`SELECT name FROM jobs WHERE id = ${job_id} AND company_id = ${user.effectiveOrgId}`

  const [co] = await sql`
    INSERT INTO change_orders (company_id, job_id, description, amount, approved)
    VALUES (${user.effectiveOrgId}, ${job_id}, ${description}, ${amount}, false)
    RETURNING *
  `

  await logActivity({
    orgId: user.effectiveOrgId!,
    actorEmail: user.email,
    entityType: 'change_order',
    entityId: co.id,
    entityName: description,
    action: 'created',
    metadata: { job_id, job_name: job?.name, amount: Number(amount) },
  })

  return NextResponse.json(co, { status: 201 })
}
