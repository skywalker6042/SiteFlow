import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const body = await req.json() as Record<string, unknown>
  const [job] = await sql`
    INSERT INTO jobs (
      company_id, name, address, scope, status, percent_complete,
      total_value, amount_billed, amount_paid,
      client_name, client_phone, planned_start, planned_end
    )
    VALUES (
      ${user.orgId},
      ${String(body.name ?? '').trim()},
      ${String(body.address ?? '').trim() || null},
      ${String(body.scope ?? '').trim() || null},
      ${String(body.status ?? 'not_started')},
      ${Number(body.percentComplete ?? 0)},
      ${Number(body.totalValue ?? 0)},
      ${Number(body.amountBilled ?? 0)},
      ${Number(body.amountPaid ?? 0)},
      ${String(body.clientName ?? '').trim() || null},
      ${String(body.clientPhone ?? '').trim() || null},
      ${String(body.plannedStart ?? '').trim() || null},
      ${String(body.plannedEnd ?? '').trim() || null}
    )
    RETURNING id, name, client_name, address, status, percent_complete, total_value, amount_paid
  `

  return NextResponse.json({
    id: job.id,
    name: job.name,
    clientName: job.client_name ?? null,
    address: job.address ?? null,
    status: job.status,
    percentComplete: Number(job.percent_complete),
    totalValue: job.total_value != null ? Number(job.total_value) : null,
    amountPaid: job.amount_paid != null ? Number(job.amount_paid) : null,
  }, { status: 201 })
}
