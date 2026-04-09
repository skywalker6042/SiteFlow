import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'
import { BacklogBoard } from '@/components/backlog/BacklogBoard'

export const dynamic = 'force-dynamic'

export default async function BacklogPage() {
  const orgId = await getOrgId()
  const jobs = await sql`
    SELECT
      j.*,
      COUNT(jt.id)                                          AS task_count,
      COUNT(jt.id) FILTER (WHERE jt.status = 'done')       AS done_task_count,
      COUNT(jp.id)                                          AS phase_count,
      COUNT(jp.id) FILTER (WHERE jp.status = 'done')       AS done_phase_count
    FROM jobs j
    LEFT JOIN job_tasks  jt ON jt.job_id = j.id
    LEFT JOIN job_phases jp ON jp.job_id = j.id
    WHERE j.company_id = ${orgId} AND j.status = 'not_started'
    GROUP BY j.id
    ORDER BY j.created_at DESC
  `

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Backlog</h1>
        <p className="text-sm text-gray-400 mt-0.5">Sort and filter all jobs</p>
      </div>
      <BacklogBoard jobs={jobs as never} />
    </div>
  )
}
