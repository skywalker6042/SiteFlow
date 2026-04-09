import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_manage_schedule) return forbidden()

  const { id } = await params
  const body = await req.json()

  const [prev] = await sql`
    SELECT wd.*, j.name AS job_name FROM work_days wd
    JOIN jobs j ON j.id = wd.job_id
    WHERE wd.id = ${id} AND wd.company_id = ${user.effectiveOrgId}
  `

  const [row] = await sql`
    UPDATE work_days SET
      status     = COALESCE(${body.status     ?? null}, status),
      notes      = CASE WHEN ${body.notes      !== undefined} THEN ${body.notes      || null} ELSE notes      END,
      start_time = CASE WHEN ${body.start_time !== undefined} THEN ${body.start_time || null} ELSE start_time END,
      end_time   = CASE WHEN ${body.end_time   !== undefined} THEN ${body.end_time   || null} ELSE end_time   END
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!row) return new NextResponse(null, { status: 404 })

  if (prev && body.status && prev.status !== body.status) {
    await logActivity({
      orgId: user.effectiveOrgId!,
      actorEmail: user.email,
      entityType: 'work_day',
      entityId: id,
      entityName: prev.job_name,
      action: `status_changed_to_${body.status}`,
      metadata: { date: prev.date, from: prev.status, to: body.status },
    })
  }

  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_manage_schedule) return forbidden()

  const { id } = await params
  const [wd] = await sql`
    SELECT wd.date, j.name AS job_name FROM work_days wd
    JOIN jobs j ON j.id = wd.job_id
    WHERE wd.id = ${id} AND wd.company_id = ${user.effectiveOrgId}
  `
  await sql`DELETE FROM work_days WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`

  await logActivity({
    orgId: user.effectiveOrgId!,
    actorEmail: user.email,
    entityType: 'work_day',
    entityId: id,
    entityName: wd?.job_name,
    action: 'deleted',
    metadata: { date: wd?.date },
  })

  return new NextResponse(null, { status: 204 })
}
