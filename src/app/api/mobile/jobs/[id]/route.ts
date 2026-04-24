import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { id } = await params

  const [jobRows, phaseRows, taskRows, photoRows, changeOrderRows] = await Promise.all([
    sql`
      SELECT id, name, client_name, client_phone, address, scope, status,
             percent_complete, total_value, amount_billed, amount_paid,
             planned_start, start_date, end_date, share_token, created_at
      FROM jobs
      WHERE id = ${id} AND company_id = ${user.orgId}
      LIMIT 1
    `,
    sql`
      SELECT id, name, status, order_index, notes, weight, group_name, estimated_hrs
      FROM job_phases
      WHERE job_id = ${id} AND company_id = ${user.orgId}
      ORDER BY order_index ASC
    `,
    sql`
      SELECT id, phase_id, name, status, order_index, notes, billable, weight
      FROM job_tasks
      WHERE job_id = ${id} AND company_id = ${user.orgId}
      ORDER BY order_index ASC
    `,
    sql`
      SELECT id, storage_path, caption, created_at
      FROM job_photos
      WHERE job_id = ${id}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, description, amount, approved, created_at
      FROM change_orders
      WHERE job_id = ${id}
      ORDER BY created_at DESC
    `,
  ])

  const job = jobRows[0]
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const j = job as Record<string, unknown>

  return NextResponse.json({
    job: {
      id: j.id,
      name: j.name,
      clientName: j.client_name ?? null,
      clientPhone: j.client_phone ?? null,
      address: j.address ?? null,
      scope: j.scope ?? null,
      status: j.status,
      percentComplete: Number(j.percent_complete),
      totalValue: j.total_value != null ? Number(j.total_value) : null,
      amountBilled: j.amount_billed != null ? Number(j.amount_billed) : null,
      amountPaid: j.amount_paid != null ? Number(j.amount_paid) : null,
      plannedStart: j.planned_start ?? null,
      plannedEnd: j.planned_end ?? null,
      startDate: j.start_date ?? null,
      endDate: j.end_date ?? null,
      shareToken: j.share_token ?? null,
    },
    phases: phaseRows.map(p => {
      const r = p as Record<string, unknown>
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        orderIndex: Number(r.order_index),
        notes: r.notes ?? null,
        groupName: r.group_name ?? null,
      }
    }),
    tasks: taskRows.map(t => {
      const r = t as Record<string, unknown>
      return {
        id: r.id,
        phaseId: r.phase_id ?? null,
        name: r.name,
        status: r.status,
        orderIndex: Number(r.order_index),
        notes: r.notes ?? null,
        billable: Boolean(r.billable),
      }
    }),
    photos: photoRows.map(p => {
      const r = p as Record<string, unknown>
      return {
        id: r.id,
        storagePath: r.storage_path,
        caption: r.caption ?? null,
      }
    }),
    changeOrders: changeOrderRows.map(c => {
      const r = c as Record<string, unknown>
      return {
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        approved: Boolean(r.approved),
      }
    }),
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const [job] = await sql`
    UPDATE jobs SET
      name = ${String(body.name ?? '').trim()},
      address = ${String(body.address ?? '').trim() || null},
      scope = ${String(body.scope ?? '').trim() || null},
      status = ${String(body.status ?? 'not_started')},
      percent_complete = ${Number(body.percentComplete ?? 0)},
      total_value = ${Number(body.totalValue ?? 0)},
      amount_billed = ${Number(body.amountBilled ?? 0)},
      amount_paid = ${Number(body.amountPaid ?? 0)},
      client_name = ${String(body.clientName ?? '').trim() || null},
      client_phone = ${String(body.clientPhone ?? '').trim() || null},
      planned_start = ${String(body.plannedStart ?? '').trim() || null},
      planned_end = ${String(body.plannedEnd ?? '').trim() || null}
    WHERE id = ${id} AND company_id = ${user.orgId}
    RETURNING id, name, client_name, address, status, percent_complete, total_value, amount_paid
  `

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: job.id,
    name: job.name,
    clientName: job.client_name ?? null,
    address: job.address ?? null,
    status: job.status,
    percentComplete: Number(job.percent_complete),
    totalValue: job.total_value != null ? Number(job.total_value) : null,
    amountPaid: job.amount_paid != null ? Number(job.amount_paid) : null,
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { status } = await req.json() as { status?: string }
  if (!status) return NextResponse.json({ error: 'Status is required' }, { status: 400 })

  const [job] = await sql`
    UPDATE jobs SET status = ${status}
    WHERE id = ${id} AND company_id = ${user.orgId}
    RETURNING id, name, client_name, address, status, percent_complete, total_value, amount_paid
  `
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: job.id,
    name: job.name,
    clientName: job.client_name ?? null,
    address: job.address ?? null,
    status: job.status,
    percentComplete: Number(job.percent_complete),
    totalValue: job.total_value != null ? Number(job.total_value) : null,
    amountPaid: job.amount_paid != null ? Number(job.amount_paid) : null,
  })
}
