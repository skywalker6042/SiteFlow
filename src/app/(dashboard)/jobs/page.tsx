import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { Card, CardBody } from '@/components/ui/Card'
import { NewJobButton } from '@/components/jobs/NewJobButton'
import { JobCard } from '@/components/jobs/JobCard'
import { JobTabBar } from '@/components/jobs/JobTabBar'

export const dynamic = 'force-dynamic'

interface JobRow {
  id: string
  name: string
  client_name: string | null
  address: string | null
  status: string
  percent_complete: number
  total_value: number
  amount_paid: number
}

interface PageProps { searchParams: Promise<{ tab?: string }> }

export default async function JobsPage({ searchParams }: PageProps) {
  const { tab = 'in-progress' } = await searchParams

  const user = await getSessionUser()
  const orgId = user.effectiveOrgId!
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }

  let jobs: JobRow[]
  if (isOwner || perms.can_view_all_jobs) {
    jobs = await sql`SELECT * FROM jobs WHERE company_id = ${orgId} ORDER BY created_at DESC` as unknown as JobRow[]
  } else {
    jobs = await sql`
      SELECT DISTINCT j.*
      FROM jobs j
      JOIN work_days wd ON wd.job_id = j.id AND wd.company_id = ${orgId}
      JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      JOIN org_members om ON om.worker_id = wdw.worker_id AND om.org_id = ${orgId} AND om.user_id = ${user.id}
      WHERE j.company_id = ${orgId}
      ORDER BY j.created_at DESC
    ` as unknown as JobRow[]
  }

  const inProgress = jobs.filter((j) => j.status === 'in_progress')
  const backlog    = jobs.filter((j) => j.status === 'not_started' || j.status === 'planned')
  const completed  = jobs.filter((j) => j.status === 'done')
  const canCreate  = isOwner || perms.can_edit_jobs
  const canEdit    = isOwner || perms.can_edit_jobs
  const showFin    = isOwner || perms.can_view_job_financials

  const counts = {
    'in-progress': inProgress.length,
    'backlog':     backlog.length,
    'completed':   completed.length,
  }

  const displayJobs =
    tab === 'backlog'   ? backlog   :
    tab === 'completed' ? completed :
    inProgress

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        {canCreate && <NewJobButton />}
      </div>

      <JobTabBar activeTab={tab} counts={counts} />

      {displayJobs.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-gray-400 text-sm">
              {tab === 'in-progress' && 'No jobs in progress.'}
              {tab === 'backlog'     && 'No jobs in the backlog.'}
              {tab === 'completed'   && 'No completed jobs yet.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {displayJobs.map((job) => (
            <JobCard key={job.id} job={job} showFinancials={showFin} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
