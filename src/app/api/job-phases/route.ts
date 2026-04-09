import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'
import { syncJobProgress } from '@/lib/progress'

export async function GET(req: NextRequest) {
  const orgId = await getOrgId()
  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const phases = await sql`
    SELECT * FROM job_phases
    WHERE job_id = ${jobId} AND company_id = ${orgId}
    ORDER BY order_index ASC, created_at ASC
  `
  return NextResponse.json(phases)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { job_id, name, notes } = await req.json()
  if (!job_id || !name) return NextResponse.json({ error: 'job_id and name required' }, { status: 400 })

  const [{ max }] = await sql`
    SELECT COALESCE(MAX(order_index), -1) AS max
    FROM job_phases WHERE job_id = ${job_id} AND company_id = ${user.effectiveOrgId}
  `
  const [phase] = await sql`
    INSERT INTO job_phases (job_id, company_id, name, status, order_index, notes)
    VALUES (${job_id}, ${user.effectiveOrgId}, ${name}, 'not_started', ${Number(max) + 1}, ${notes || null})
    RETURNING *
  `
  await syncJobProgress(job_id, user.effectiveOrgId!)
  return NextResponse.json(phase, { status: 201 })
}
