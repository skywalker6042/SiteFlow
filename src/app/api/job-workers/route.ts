import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'

// PUT /api/job-workers — replace the full crew list for a job atomically
export async function PUT(req: NextRequest) {
  const orgId = await getOrgId()
  const { job_id, worker_ids } = await req.json() as { job_id: string; worker_ids: string[] }

  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  // Verify job belongs to this company
  const [job] = await sql`SELECT id FROM jobs WHERE id = ${job_id} AND company_id = ${orgId}`
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Remove existing assignments for this job
  await sql`DELETE FROM job_workers WHERE job_id = ${job_id}`

  // Insert new assignments (only for workers that belong to this company)
  if (worker_ids.length > 0) {
    const validWorkers = await sql`
      SELECT id FROM workers WHERE id = ANY(${worker_ids}::uuid[]) AND company_id = ${orgId}
    `
    if (validWorkers.length > 0) {
      const rows = validWorkers.map((w) => ({ job_id, worker_id: w.id }))
      await sql`INSERT INTO job_workers ${sql(rows)}`
    }
  }

  return new NextResponse(null, { status: 204 })
}
