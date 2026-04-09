import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { notFound } from 'next/navigation'
import type { Job, ChangeOrder, JobPhoto, JobPhase, JobTask, WorkerWithSpecialties, WorkDayWithCrew, TeamWithMembers } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, statusLabel, statusColor } from '@/lib/utils'
import { calcOverallProgress } from '@/lib/phases'
import { MapPin, Phone, DollarSign, CalendarRange } from 'lucide-react'
import { JobActions } from '@/components/jobs/JobActions'
import { ChangeOrderList } from '@/components/jobs/ChangeOrderList'
import { PhotoGrid } from '@/components/jobs/PhotoGrid'
import { PhaseList } from '@/components/jobs/PhaseList'
import { WorkDayList } from '@/components/jobs/WorkDayList'
import { TaskList } from '@/components/jobs/TaskList'
import { CollapsibleActivity } from '@/components/activity/CollapsibleActivity'
import { ShareJobButton } from '@/components/jobs/ShareJobButton'
import { StatusChanger } from '@/components/jobs/StatusChanger'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!id) notFound()

  const user = await getSessionUser()
  const orgId = user.effectiveOrgId!
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }

  const canViewFinancials   = isOwner || perms.can_view_job_financials
  const canEditJob          = isOwner || perms.can_edit_jobs
  const canViewActivity     = isOwner || perms.can_view_activity
  const canViewChangeOrders = isOwner || perms.can_view_change_orders
  const canManageSchedule   = isOwner || perms.can_manage_schedule
  const canManageTasks      = isOwner || perms.can_manage_tasks
  const canCompleteTasks    = isOwner || perms.can_complete_tasks

  const [jobRows, changeOrders, photos, phases, tasks, allWorkerRows, workDayRows, teamRows, activityLogs] = await Promise.all([
    sql`SELECT *, share_token FROM jobs WHERE id = ${id} AND company_id = ${orgId}`,
    sql`SELECT * FROM change_orders WHERE job_id = ${id} AND company_id = ${orgId} ORDER BY created_at DESC`,
    sql`SELECT * FROM job_photos WHERE job_id = ${id} AND company_id = ${orgId} ORDER BY created_at DESC`,
    sql`SELECT * FROM job_phases WHERE job_id = ${id} AND company_id = ${orgId} ORDER BY order_index ASC`,
    sql`SELECT * FROM job_tasks  WHERE job_id = ${id} AND company_id = ${orgId} ORDER BY order_index ASC, created_at ASC`,
    sql`
      SELECT w.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name))
          FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS specialties
      FROM workers w
      LEFT JOIN worker_specialties ws ON ws.worker_id = w.id
      LEFT JOIN specialties s ON s.id = ws.specialty_id
      WHERE w.company_id = ${orgId}
      GROUP BY w.id ORDER BY w.name
    ` as any,
    sql`
      SELECT
        wd.*,
        COALESCE(
          json_agg(
            jsonb_build_object('id', w.id, 'name', w.name, 'phone', w.phone, 'role', w.role, 'created_at', w.created_at)
            ORDER BY w.name
          ) FILTER (WHERE w.id IS NOT NULL), '[]'
        ) AS workers
      FROM work_days wd
      LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      LEFT JOIN workers w ON w.id = wdw.worker_id
      WHERE wd.job_id = ${id} AND wd.company_id = ${orgId}
      GROUP BY wd.id ORDER BY wd.date ASC
    `,
    sql`
      SELECT
        t.id, t.company_id, t.name, t.color, t.created_at,
        COALESCE(
          json_agg(
            jsonb_build_object('id', w.id, 'name', w.name, 'phone', w.phone, 'role', w.role, 'created_at', w.created_at)
            ORDER BY w.name
          ) FILTER (WHERE w.id IS NOT NULL), '[]'
        ) AS members
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      LEFT JOIN workers w ON w.id = tm.worker_id
      WHERE t.company_id = ${orgId}
      GROUP BY t.id ORDER BY t.name
    `,
    sql`
      SELECT * FROM activity_logs
      WHERE company_id = ${orgId}
        AND (
          (entity_type = 'job' AND entity_id = ${id})
          OR (metadata->>'job_id' = ${id})
        )
      ORDER BY created_at DESC
      LIMIT 50
    `,
  ])

  if (!jobRows.length) notFound()

  const job        = jobRows[0]        as unknown as Job
  const orders     = changeOrders      as unknown as ChangeOrder[]
  const jobPhotos  = photos            as unknown as JobPhoto[]
  const jobPhases  = phases            as unknown as JobPhase[]
  const jobTasks   = tasks             as unknown as JobTask[]
  const allWorkers = allWorkerRows     as unknown as WorkerWithSpecialties[]
  const workDays   = workDayRows       as unknown as WorkDayWithCrew[]
  const teams      = teamRows          as unknown as TeamWithMembers[]
  const jobLogs    = activityLogs      as unknown as any[]

  const progress = calcOverallProgress(jobTasks, jobPhases, Number(job.percent_complete))
  const outstanding = Number(job.total_value) - Number(job.amount_paid)
  const changeOrderTotal = orders.filter((co) => co.approved).reduce((acc, co) => acc + Number(co.amount), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.name}</h1>
            {job.address && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <MapPin size={13} className="shrink-0" /> <span className="truncate">{job.address}</span>
              </div>
            )}
          </div>
          {canEditJob && <JobActions job={job} />}
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 flex-wrap">
            <ShareJobButton jobId={job.id} initialToken={(job as any).share_token ?? null} />
          </div>
        )}
      </div>

      {/* Status + Progress */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {canEditJob
              ? <StatusChanger jobId={job.id} initialStatus={job.status as any} />
              : <Badge className={statusColor(job.status)}>{statusLabel(job.status)}</Badge>
            }
            <span className="text-sm font-medium text-gray-600">{progress}% complete</span>
          </div>
          <ProgressBar value={progress} showLabel={false} />
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
            {jobTasks.length > 0 && (
              <span>From {jobTasks.filter(t => t.status === 'done').length}/{jobTasks.length} tasks</span>
            )}
            {jobTasks.length === 0 && jobPhases.length > 0 && (
              <span>From {jobPhases.filter(p => p.status === 'done').length}/{jobPhases.length} phases</span>
            )}
            {job.planned_start && (
              <span className="flex items-center gap-1">
                <CalendarRange size={11} />
                {job.planned_start}{job.planned_end ? ` → ${job.planned_end}` : ''}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Work Days */}
      <WorkDayList
        jobId={job.id}
        initialWorkDays={workDays}
        allWorkers={canManageSchedule ? allWorkers : []}
        teams={canManageSchedule ? teams : []}
        canManage={canManageSchedule}
      />

      {/* Tasks */}
      <TaskList
        jobId={job.id}
        initialTasks={jobTasks}
        phases={jobPhases}
        canManage={canManageTasks}
        canComplete={canCompleteTasks}
      />

      {/* Phases — owner only */}
      {isOwner && <PhaseList jobId={job.id} initialPhases={jobPhases} />}

      {/* Financials */}
      {canViewFinancials && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <DollarSign size={15} /> Financials
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <FinancialRow label="Contract Value"  value={Number(job.total_value)} />
            {changeOrderTotal > 0 && <FinancialRow label="Change Orders" value={changeOrderTotal} />}
            <FinancialRow label="Billed" value={Number(job.amount_billed)} />
            <FinancialRow label="Paid"   value={Number(job.amount_paid)} />
            <div className="border-t border-gray-100 pt-2 mt-1 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Outstanding</span>
              <span className={`text-sm font-bold ${outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(outstanding)}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Client — owners only */}
      {isOwner && (job.client_name || job.client_phone) && (
        <Card>
          <CardHeader><span className="text-sm font-semibold text-gray-700">Client</span></CardHeader>
          <CardBody className="flex flex-col gap-1">
            {job.client_name && <p className="text-sm font-medium text-gray-900">{job.client_name}</p>}
            {job.client_phone && (
              <a href={`tel:${job.client_phone}`} className="flex items-center gap-1.5 text-sm text-orange-500">
                <Phone size={13} /> {job.client_phone}
              </a>
            )}
          </CardBody>
        </Card>
      )}

      {/* Scope */}
      {job.scope && (
        <Card>
          <CardHeader><span className="text-sm font-semibold text-gray-700">Scope of Work</span></CardHeader>
          <CardBody><p className="text-sm text-gray-700 whitespace-pre-line">{job.scope}</p></CardBody>
        </Card>
      )}

      {/* Change Orders */}
      {canViewChangeOrders && (
        <ChangeOrderList
          jobId={job.id}
          changeOrders={orders}
          canManage={isOwner || perms.can_manage_change_orders}
        />
      )}

      <PhotoGrid jobId={job.id} photos={jobPhotos} canUpload={isOwner || perms.can_upload_photos} />

      {/* Activity */}
      {canViewActivity && jobLogs.length > 0 && (
        <CollapsibleActivity logs={jobLogs} />
      )}
    </div>
  )
}

function FinancialRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{formatCurrency(value)}</span>
    </div>
  )
}
