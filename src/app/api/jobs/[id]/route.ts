import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const body = await req.json()
  const {
    name, address, scope, status, percent_complete,
    total_value, amount_billed, amount_paid,
    client_name, client_phone, planned_start, planned_end,
  } = body

  const [prev] = await sql`SELECT status, total_value, amount_billed, amount_paid, name FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`

  const [job] = await sql`
    UPDATE jobs SET
      name             = ${name},
      address          = ${address          || null},
      scope            = ${scope            || null},
      status           = ${status},
      percent_complete = ${percent_complete ?? 0},
      total_value      = ${total_value      ?? 0},
      amount_billed    = ${amount_billed    ?? 0},
      amount_paid      = ${amount_paid      ?? 0},
      client_name      = ${client_name      || null},
      client_phone     = ${client_phone     || null},
      planned_start    = ${planned_start    || null},
      planned_end      = ${planned_end      || null}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `

  if (prev && job) {
    const changes: Record<string, unknown> = {}
    if (prev.status !== job.status)                   changes.status        = { from: prev.status,        to: job.status }
    if (Number(prev.total_value)   !== Number(job.total_value))   changes.total_value   = { from: Number(prev.total_value),   to: Number(job.total_value) }
    if (Number(prev.amount_billed) !== Number(job.amount_billed)) changes.amount_billed = { from: Number(prev.amount_billed), to: Number(job.amount_billed) }
    if (Number(prev.amount_paid)   !== Number(job.amount_paid))   changes.amount_paid   = { from: Number(prev.amount_paid),   to: Number(job.amount_paid) }

    const action = prev.status !== job.status ? `status_changed_to_${job.status}` : 'updated'
    await logActivity({
      orgId: user.effectiveOrgId!,
      actorEmail: user.email,
      entityType: 'job',
      entityId: job.id,
      entityName: job.name,
      action,
      metadata: Object.keys(changes).length ? changes : undefined,
    })
  }

  return NextResponse.json(job)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const { status } = await req.json() as { status: string }

  const [prev] = await sql`SELECT status, name FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  const [job]  = await sql`
    UPDATE jobs SET status = ${status}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (prev?.status !== status) {
    await logActivity({
      orgId: user.effectiveOrgId!,
      actorEmail: user.email,
      entityType: 'job',
      entityId: job.id,
      entityName: job.name,
      action: `status_changed_to_${status}`,
      metadata: { status: { from: prev?.status, to: status } },
    })
  }

  return NextResponse.json(job)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const [job] = await sql`SELECT name FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  await sql`DELETE FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`

  await logActivity({
    orgId: user.effectiveOrgId!,
    actorEmail: user.email,
    entityType: 'job',
    entityId: id,
    entityName: job?.name,
    action: 'deleted',
  })

  return new NextResponse(null, { status: 204 })
}
