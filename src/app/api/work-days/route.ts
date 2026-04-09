import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const user  = await getSessionUser()
  const orgId = user.effectiveOrgId
  const { searchParams } = req.nextUrl
  const jobId = searchParams.get('job_id')
  const year  = searchParams.get('year')
  const month = searchParams.get('month')

  if (jobId) {
    const rows = await sql`
      SELECT wd.*,
        COALESCE(
          json_agg(jsonb_build_object('id', w.id, 'name', w.name, 'phone', w.phone, 'role', w.role, 'created_at', w.created_at) ORDER BY w.name)
          FILTER (WHERE w.id IS NOT NULL), '[]'
        ) AS workers
      FROM work_days wd
      LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      LEFT JOIN workers w ON w.id = wdw.worker_id
      WHERE wd.job_id = ${jobId} AND wd.company_id = ${orgId}
      GROUP BY wd.id ORDER BY wd.date ASC, wd.created_at ASC
    `
    return NextResponse.json(rows)
  }

  if (year && month) {
    const y = parseInt(year), m = parseInt(month)
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay  = new Date(y, m, 0).toISOString().slice(0, 10)

    const rows = await sql`
      SELECT wd.id, wd.job_id, wd.company_id, wd.date, wd.status, wd.notes, wd.start_time, wd.end_time, wd.created_at,
        j.name AS job_name, j.status AS job_status,
        COALESCE(
          json_agg(jsonb_build_object('id', w.id, 'name', w.name) ORDER BY w.name)
          FILTER (WHERE w.id IS NOT NULL), '[]'
        ) AS workers
      FROM work_days wd
      JOIN jobs j ON j.id = wd.job_id
      LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      LEFT JOIN workers w ON w.id = wdw.worker_id
      WHERE wd.company_id = ${orgId}
        AND wd.date >= ${firstDay}
        AND wd.date <= ${lastDay}
      GROUP BY wd.id, j.name, j.status
      ORDER BY wd.date ASC, j.name ASC
    `
    return NextResponse.json(rows)
  }

  return NextResponse.json({ error: 'Provide job_id or year+month' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_manage_schedule) return forbidden()

  const { job_id, date, notes } = await req.json()
  if (!job_id || !date) return NextResponse.json({ error: 'job_id and date required' }, { status: 400 })

  const [job] = await sql`SELECT id, name FROM jobs WHERE id = ${job_id} AND company_id = ${user.effectiveOrgId}`
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const [row] = await sql`
    INSERT INTO work_days (job_id, company_id, date, status, notes)
    VALUES (${job_id}, ${user.effectiveOrgId}, ${date}, 'planned', ${notes || null})
    RETURNING *
  `

  await logActivity({
    orgId: user.effectiveOrgId!,
    actorEmail: user.email,
    entityType: 'work_day',
    entityId: row.id,
    entityName: job.name,
    action: 'scheduled',
    metadata: { date, job_id },
  })

  return NextResponse.json({ ...row, workers: [] }, { status: 201 })
}
