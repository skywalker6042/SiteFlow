import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const orgId = await getOrgId()
  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const tasks = await sql`
    SELECT * FROM job_tasks
    WHERE job_id = ${jobId} AND company_id = ${orgId}
    ORDER BY order_index ASC, created_at ASC
  `
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { job_id, phase_id, name, notes, weight } = await req.json()
  if (!job_id || !name) return NextResponse.json({ error: 'job_id and name required' }, { status: 400 })

  const [job] = await sql`SELECT id FROM jobs WHERE id = ${job_id} AND company_id = ${user.effectiveOrgId}`
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const [{ max }] = await sql`
    SELECT COALESCE(MAX(order_index), -1) AS max FROM job_tasks
    WHERE job_id = ${job_id} AND company_id = ${user.effectiveOrgId}
  `
  const [task] = await sql`
    INSERT INTO job_tasks (company_id, job_id, phase_id, name, notes, weight, order_index)
    VALUES (${user.effectiveOrgId}, ${job_id}, ${phase_id || null}, ${name}, ${notes || null}, ${weight ?? null}, ${Number(max) + 1})
    RETURNING *
  `
  return NextResponse.json(task, { status: 201 })
}
