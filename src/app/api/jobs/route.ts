import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const orgId = await getOrgId()
  const jobs = await sql`SELECT * FROM jobs WHERE company_id = ${orgId} ORDER BY created_at DESC`
  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const orgId = user.effectiveOrgId
  const body = await req.json()
  const {
    name, address, scope, status, percent_complete,
    total_value, amount_billed, amount_paid,
    client_name, client_phone, planned_start, planned_end,
  } = body

  const [job] = await sql`
    INSERT INTO jobs (
      company_id, name, address, scope, status, percent_complete,
      total_value, amount_billed, amount_paid,
      client_name, client_phone, planned_start, planned_end
    )
    VALUES (
      ${orgId}, ${name}, ${address || null}, ${scope || null},
      ${status ?? 'not_started'}, ${percent_complete ?? 0},
      ${total_value ?? 0}, ${amount_billed ?? 0}, ${amount_paid ?? 0},
      ${client_name || null}, ${client_phone || null},
      ${planned_start || null}, ${planned_end || null}
    )
    RETURNING *
  `

  await logActivity({
    orgId: orgId!,
    actorEmail: user.email,
    entityType: 'job',
    entityId: job.id,
    entityName: job.name,
    action: 'created',
    metadata: { status: job.status, total_value: Number(job.total_value) },
  })

  return NextResponse.json(job, { status: 201 })
}
