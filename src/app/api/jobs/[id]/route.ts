import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'
import { sendPhotoWarningEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

interface Params { params: Promise<{ id: string }> }

async function ensureCompletedAtColumn() {
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`
}

async function triggerJobCompleteEmail(orgId: string, job: { id: string; name: string; share_token?: string }) {
  try {
    console.log(`[email] job complete trigger — orgId=${orgId} jobId=${job.id}`)

    const [owner] = await sql`
      SELECT u.email
      FROM users u
      JOIN org_members om ON om.user_id = u.id
      WHERE om.org_id = ${orgId} AND om.role = 'owner'
      LIMIT 1
    `
    if (!owner) {
      console.log(`[email] no owner found for org ${orgId} — skipping`)
      return
    }
    console.log(`[email] sending photo warning to ${owner.email}`)

    let token = job.share_token
    if (!token) {
      token = randomBytes(20).toString('hex')
      await sql`UPDATE jobs SET share_token = ${token} WHERE id = ${job.id}`
    }

    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://siteflo.app'
    const downloadUrl = `${appUrl}/api/share/${token}/photos/download`
    const deleteDate  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    await sendPhotoWarningEmail(owner.email, job.name, downloadUrl, deleteDate)
    console.log(`[email] photo warning sent to ${owner.email}`)
  } catch (err) {
    console.error('[email] triggerJobCompleteEmail failed:', err)
  }
}

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

  await ensureCompletedAtColumn()
  const [prev] = await sql`SELECT status, total_value, amount_billed, amount_paid, name, share_token FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`

  const completedAt = status === 'done' && prev?.status !== 'done'
    ? sql`NOW()`
    : status !== 'done'
      ? sql`NULL`
      : sql`completed_at`

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
      planned_end      = ${planned_end      || null},
      completed_at     = ${completedAt}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `

  if (status === 'done') {
    await sql`UPDATE job_tasks  SET status = 'done' WHERE job_id = ${id} AND company_id = ${user.effectiveOrgId!}`
    await sql`UPDATE job_phases SET status = 'done' WHERE job_id = ${id} AND company_id = ${user.effectiveOrgId!}`
    await sql`UPDATE jobs SET percent_complete = 100 WHERE id = ${id} AND company_id = ${user.effectiveOrgId!}`
  }

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

    if (prev.status !== 'done' && job.status === 'done') {
      triggerJobCompleteEmail(user.effectiveOrgId!, { id: job.id, name: job.name, share_token: prev.share_token })
    }
  }

  return NextResponse.json(job)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const { status } = await req.json() as { status: string }

  await ensureCompletedAtColumn()
  const [prev] = await sql`SELECT status, name, share_token FROM jobs WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`

  const completedAt = status === 'done' && prev?.status !== 'done'
    ? sql`NOW()`
    : status !== 'done'
      ? sql`NULL`
      : sql`completed_at`

  const [job] = await sql`
    UPDATE jobs SET status = ${status}, completed_at = ${completedAt}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (status === 'done') {
    await sql`UPDATE job_tasks  SET status = 'done' WHERE job_id = ${id} AND company_id = ${user.effectiveOrgId!}`
    await sql`UPDATE job_phases SET status = 'done' WHERE job_id = ${id} AND company_id = ${user.effectiveOrgId!}`
    await sql`UPDATE jobs SET percent_complete = 100 WHERE id = ${id} AND company_id = ${user.effectiveOrgId!}`
  }

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

    if (prev?.status !== 'done' && status === 'done') {
      triggerJobCompleteEmail(user.effectiveOrgId!, { id: job.id, name: job.name, share_token: prev?.share_token })
    }
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
