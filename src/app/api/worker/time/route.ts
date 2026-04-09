import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, unauthorized } from '@/lib/auth-context'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS worker_time_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL,
      worker_name TEXT NOT NULL,
      job_id      UUID,
      job_name    TEXT,
      clock_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clock_out   TIMESTAMPTZ,
      date        DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `
}

// GET — current open entry for this user
export async function GET() {
  const user  = await getSessionUser()
  if (!user?.id) return unauthorized()
  const orgId = user.effectiveOrgId!
  await ensureTable()

  const [open] = await sql`
    SELECT * FROM worker_time_logs
    WHERE company_id = ${orgId} AND user_id = ${user.id} AND clock_out IS NULL
    ORDER BY clock_in DESC LIMIT 1
  `
  return NextResponse.json({ open: open ?? null })
}

// POST — clock in
export async function POST(req: NextRequest) {
  const user  = await getSessionUser()
  if (!user?.id) return unauthorized()
  const orgId = user.effectiveOrgId!
  await ensureTable()

  // Close any open entry first
  await sql`
    UPDATE worker_time_logs SET clock_out = NOW()
    WHERE company_id = ${orgId} AND user_id = ${user.id} AND clock_out IS NULL
  `

  const { job_id } = (await req.json().catch(() => ({}))) as { job_id?: string }

  let jobName: string | null = null
  if (job_id) {
    const [j] = await sql`SELECT name FROM jobs WHERE id = ${job_id} AND company_id = ${orgId}`
    jobName = j?.name ?? null
  }

  const [entry] = await sql`
    INSERT INTO worker_time_logs (company_id, user_id, worker_name, job_id, job_name)
    VALUES (
      ${orgId}, ${user.id},
      ${user.name ?? user.email ?? 'Unknown'},
      ${job_id ?? null}, ${jobName}
    )
    RETURNING *
  `
  return NextResponse.json(entry)
}

// PATCH — clock out
export async function PATCH() {
  const user  = await getSessionUser()
  if (!user?.id) return unauthorized()
  const orgId = user.effectiveOrgId!
  await ensureTable()

  const [entry] = await sql`
    UPDATE worker_time_logs SET clock_out = NOW()
    WHERE company_id = ${orgId} AND user_id = ${user.id} AND clock_out IS NULL
    RETURNING *
  `
  if (!entry) return NextResponse.json({ error: 'No open entry' }, { status: 404 })
  return NextResponse.json(entry)
}
