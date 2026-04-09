import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { Card, CardBody } from '@/components/ui/Card'
import { NewJobButton } from '@/components/jobs/NewJobButton'
import { JobCard } from '@/components/jobs/JobCard'

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

export default async function JobsPage() {
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

  const inProgress  = jobs.filter((j) => j.status === 'in_progress')
  const planned     = jobs.filter((j) => j.status === 'planned')
  const notStarted  = jobs.filter((j) => j.status === 'not_started')
  const doneJobs    = jobs.filter((j) => j.status === 'done')
  const canCreate   = isOwner || perms.can_edit_jobs
  const canEdit     = isOwner || perms.can_edit_jobs
  const showFin     = isOwner || perms.can_view_job_financials

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        {canCreate && <NewJobButton />}
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-gray-400 text-sm">
              {isOwner || perms.can_view_all_jobs
                ? 'No jobs yet. Add your first job.'
                : "You haven't been assigned to any jobs yet."}
            </p>
          </CardBody>
        </Card>
      )}

      {inProgress.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">In Progress</h2>
          <div className="flex flex-col gap-2">
            {inProgress.map((job) => <JobCard key={job.id} job={job} showFinancials={showFin} canEdit={canEdit} />)}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Planned</h2>
          <div className="flex flex-col gap-2">
            {planned.map((job) => <JobCard key={job.id} job={job} showFinancials={showFin} canEdit={canEdit} />)}
          </div>
        </section>
      )}

      {notStarted.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Not Started</h2>
          <div className="flex flex-col gap-2">
            {notStarted.map((job) => <JobCard key={job.id} job={job} showFinancials={showFin} canEdit={canEdit} />)}
          </div>
        </section>
      )}

      {doneJobs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completed</h2>
          <div className="flex flex-col gap-2">
            {doneJobs.map((job) => <JobCard key={job.id} job={job} showFinancials={showFin} canEdit={canEdit} />)}
          </div>
        </section>
      )}
    </div>
  )
}
