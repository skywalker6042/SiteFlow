import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// GET — current open entry + today's logs + available jobs
export async function GET() {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'

  const today = new Date().toISOString().slice(0, 10)

  const [openRows, logRows, jobRows, workerRow, teamRows] = await Promise.all([
    sql`
      SELECT id, clock_in, clock_out, job_id, job_name
      FROM worker_time_logs
      WHERE company_id = ${user.orgId} AND user_id = ${user.id} AND clock_out IS NULL
      ORDER BY clock_in DESC LIMIT 1
    `,
    sql`
      SELECT id, clock_in, clock_out, job_id, job_name
      FROM worker_time_logs
      WHERE company_id = ${user.orgId} AND user_id = ${user.id} AND date = ${today}
      ORDER BY clock_in ASC
    `,
    sql`
      SELECT id, name FROM jobs
      WHERE company_id = ${user.orgId} AND status = 'in_progress'
      ORDER BY name ASC
    `,
    sql`
      SELECT w.name FROM workers w
      JOIN org_members om ON om.worker_id = w.id
      WHERE om.user_id = ${user.id} AND om.org_id = ${user.orgId}
      LIMIT 1
    `,
    isOwner ? sql`
      SELECT id, worker_name, clock_in, clock_out, job_id, job_name
      FROM worker_time_logs
      WHERE company_id = ${user.orgId} AND date = ${today}
      ORDER BY clock_in DESC
      LIMIT 50
    ` : Promise.resolve([]),
  ])

  const toEntry = (r: Record<string, unknown>) => ({
    id: r.id,
    clockIn: (r.clock_in as Date).toISOString(),
    clockOut: r.clock_out ? (r.clock_out as Date).toISOString() : null,
    jobId: r.job_id ?? null,
    jobName: r.job_name ?? null,
  })

  const toTeamEntry = (r: Record<string, unknown>) => ({
    id: r.id,
    workerName: r.worker_name ?? 'Unknown Worker',
    clockIn: (r.clock_in as Date).toISOString(),
    clockOut: r.clock_out ? (r.clock_out as Date).toISOString() : null,
    jobId: r.job_id ?? null,
    jobName: r.job_name ?? null,
  })

  return NextResponse.json({
    open: openRows[0] ? toEntry(openRows[0] as Record<string, unknown>) : null,
    logs: logRows.map(r => toEntry(r as Record<string, unknown>)),
    jobs: jobRows.map(j => ({ id: j.id, name: j.name })),
    workerName: (workerRow[0] as { name?: string } | undefined)?.name ?? user.email,
    teamLogs: teamRows.map(r => toTeamEntry(r as Record<string, unknown>)),
  })
}

// POST — clock in
export async function POST(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: string }

  const [workerRow] = await sql`
    SELECT w.name FROM workers w
    JOIN org_members om ON om.worker_id = w.id
    WHERE om.user_id = ${user.id} AND om.org_id = ${user.orgId}
    LIMIT 1
  `
  const workerName = (workerRow as { name?: string } | undefined)?.name ?? user.email

  // Close any open entry first
  await sql`
    UPDATE worker_time_logs SET clock_out = NOW()
    WHERE company_id = ${user.orgId} AND user_id = ${user.id} AND clock_out IS NULL
  `

  let jobName: string | null = null
  if (jobId) {
    const [j] = await sql`SELECT name FROM jobs WHERE id = ${jobId} AND company_id = ${user.orgId}`
    jobName = (j as { name?: string } | undefined)?.name ?? null
  }

  const [entry] = await sql`
    INSERT INTO worker_time_logs (company_id, user_id, worker_name, job_id, job_name)
    VALUES (${user.orgId}, ${user.id}, ${workerName}, ${jobId ?? null}, ${jobName})
    RETURNING id, clock_in, clock_out, job_id, job_name
  `

  const e = entry as Record<string, unknown>
  return NextResponse.json({
    id: e.id,
    clockIn: (e.clock_in as Date).toISOString(),
    clockOut: null,
    jobId: e.job_id ?? null,
    jobName: e.job_name ?? null,
  })
}

// PATCH — clock out
export async function PATCH() {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const [entry] = await sql`
    UPDATE worker_time_logs SET clock_out = NOW()
    WHERE company_id = ${user.orgId} AND user_id = ${user.id} AND clock_out IS NULL
    RETURNING id, clock_in, clock_out, job_id, job_name
  `
  if (!entry) return NextResponse.json({ error: 'Not clocked in' }, { status: 404 })

  const e = entry as Record<string, unknown>
  return NextResponse.json({
    id: e.id,
    clockIn: (e.clock_in as Date).toISOString(),
    clockOut: (e.clock_out as Date).toISOString(),
    jobId: e.job_id ?? null,
    jobName: e.job_name ?? null,
  })
}
