import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { id: jobId } = await params
  const { taskId, status } = await req.json() as { taskId: string; status: string }

  if (!taskId || !status) {
    return NextResponse.json({ error: 'taskId and status required' }, { status: 400 })
  }

  const [task] = await sql`
    UPDATE job_tasks SET status = ${status}
    WHERE id = ${taskId} AND job_id = ${jobId} AND company_id = ${user.orgId}
    RETURNING id, phase_id, name, status, order_index, notes, billable
  `
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-complete phase if all its tasks are done
  const t = task as Record<string, unknown>
  if (t.phase_id && status === 'done') {
    const [remaining] = await sql`
      SELECT COUNT(*) as count FROM job_tasks
      WHERE phase_id = ${t.phase_id as string} AND status != 'done'
    `
    if (Number((remaining as Record<string, unknown>).count) === 0) {
      await sql`UPDATE job_phases SET status = 'done' WHERE id = ${t.phase_id as string}`
    }
  }

  return NextResponse.json({
    id: t.id, phaseId: t.phase_id ?? null, name: t.name,
    status: t.status, orderIndex: Number(t.order_index),
    notes: t.notes ?? null, billable: Boolean(t.billable),
  })
}
