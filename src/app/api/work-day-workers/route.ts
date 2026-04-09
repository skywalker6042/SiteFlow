import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'

export async function GET(req: Request) {
  const orgId = await getOrgId()
  const { searchParams } = new URL(req.url)
  const workDayId = searchParams.get('work_day_id')
  if (!workDayId) return NextResponse.json({ error: 'work_day_id required' }, { status: 400 })

  const workers = await sql`
    SELECT w.id, w.name, w.phone, w.role, w.created_at, wdw.hours
    FROM workers w
    JOIN work_day_workers wdw ON wdw.worker_id = w.id
    WHERE wdw.work_day_id = ${workDayId} AND wdw.company_id = ${orgId}
    ORDER BY w.name
  `
  return NextResponse.json(workers)
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_manage_schedule) return forbidden()

  const body = await req.json() as {
    work_day_id: string
    // New format: array of { worker_id, hours }
    workers?: { worker_id: string; hours: number | null }[]
    // Legacy format: plain array of worker_ids (backwards compat)
    worker_ids?: string[]
  }
  const { work_day_id } = body
  if (!work_day_id) return NextResponse.json({ error: 'work_day_id required' }, { status: 400 })

  const [day] = await sql`SELECT id FROM work_days WHERE id = ${work_day_id} AND company_id = ${user.effectiveOrgId}`
  if (!day) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await sql`DELETE FROM work_day_workers WHERE work_day_id = ${work_day_id}`

  // Normalise both call formats
  const entries: { worker_id: string; hours: number | null }[] =
    body.workers
      ? body.workers
      : (body.worker_ids ?? []).map((wid) => ({ worker_id: wid, hours: null }))

  if (entries.length > 0) {
    const rows = entries.map(({ worker_id, hours }) => ({
      work_day_id,
      worker_id,
      company_id: user.effectiveOrgId!,
      hours: hours ?? null,
    }))
    await sql`INSERT INTO work_day_workers ${sql(rows, 'work_day_id', 'worker_id', 'company_id', 'hours')}`
  }

  const workers = await sql`
    SELECT w.id, w.name, w.phone, w.role, w.created_at, wdw.hours
    FROM workers w
    JOIN work_day_workers wdw ON wdw.worker_id = w.id
    WHERE wdw.work_day_id = ${work_day_id} AND wdw.company_id = ${user.effectiveOrgId}
    ORDER BY w.name
  `
  return NextResponse.json(workers)
}
