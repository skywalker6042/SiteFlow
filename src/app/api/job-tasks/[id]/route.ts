import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { syncJobProgress } from '@/lib/progress'
import { logActivity } from '@/lib/activity'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const body = await req.json()

  const [current] = await sql`SELECT * FROM job_tasks WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  if (!current) return new NextResponse(null, { status: 404 })

  const [task] = await sql`
    UPDATE job_tasks SET
      status   = COALESCE(${body.status   ?? null}, status),
      name     = COALESCE(${body.name     ?? null}, name),
      notes    = CASE WHEN ${body.notes    !== undefined} THEN ${body.notes    || null} ELSE notes    END,
      weight   = CASE WHEN ${body.weight   !== undefined} THEN ${body.weight   ?? null} ELSE weight   END,
      phase_id = CASE WHEN ${body.phase_id !== undefined} THEN ${body.phase_id || null} ELSE phase_id END
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  await syncJobProgress(current.job_id, user.effectiveOrgId!)

  // Auto-complete phase when all its tasks are done
  if (body.status === 'done' && task.phase_id) {
    const phaseTasks = await sql`
      SELECT status FROM job_tasks
      WHERE phase_id = ${task.phase_id} AND company_id = ${user.effectiveOrgId}
    `
    if (phaseTasks.length > 0 && phaseTasks.every((t) => t.status === 'done')) {
      await sql`
        UPDATE job_phases SET status = 'done'
        WHERE id = ${task.phase_id} AND company_id = ${user.effectiveOrgId}
      `
      await syncJobProgress(current.job_id, user.effectiveOrgId!)
    }
  }

  if (body.status && current.status !== body.status) {
    const [job] = await sql`SELECT name FROM jobs WHERE id = ${current.job_id}`
    await logActivity({
      orgId: user.effectiveOrgId!,
      actorEmail: user.email,
      entityType: 'task',
      entityId: id,
      entityName: current.name,
      action: body.status === 'done' ? 'completed' : `status_changed_to_${body.status}`,
      metadata: { job_id: current.job_id, job_name: job?.name, from: current.status, to: body.status },
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const [task] = await sql`
    DELETE FROM job_tasks WHERE id = ${id} AND company_id = ${user.effectiveOrgId} RETURNING job_id, name
  `
  if (!task) return new NextResponse(null, { status: 404 })
  await syncJobProgress(task.job_id, user.effectiveOrgId!)
  return new NextResponse(null, { status: 204 })
}
