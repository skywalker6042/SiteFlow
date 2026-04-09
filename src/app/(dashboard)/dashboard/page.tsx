import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { Card, CardBody } from '@/components/ui/Card'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { formatCurrency } from '@/lib/utils'
import { JobCard } from '@/components/jobs/JobCard'
import { WorkDayCard } from '@/components/jobs/WorkDayCard'
import { DollarSign, HardHat, AlertCircle, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const user   = await getSessionUser()
  const orgId  = user.effectiveOrgId!
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const perms  = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const canViewFinancials = isOwner || perms.can_view_job_financials
  const canEdit = isOwner || perms.can_edit_jobs

  const today   = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [activeJobs, kpis, upcomingDays, recentActivity] = await Promise.all([
    sql`
      SELECT id, name, client_name, address, status, percent_complete, total_value, amount_paid
      FROM jobs
      WHERE company_id = ${orgId} AND status = 'in_progress'
      ORDER BY created_at DESC
      LIMIT 5
    `,
    canViewFinancials ? sql`
      SELECT
        COALESCE(SUM(total_value - amount_paid), 0)   AS total_owed,
        COALESCE(SUM(amount_billed), 0)               AS total_billed,
        COALESCE(SUM(total_value - amount_billed), 0) AS total_unbilled,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS active_count
      FROM jobs WHERE company_id = ${orgId}
    ` : sql`
      SELECT COUNT(*) FILTER (WHERE status = 'in_progress') AS active_count
      FROM jobs WHERE company_id = ${orgId}
    `,
    sql`
      SELECT
        wd.id, wd.date, wd.status, wd.job_id,
        j.name AS job_name,
        COALESCE(
          json_agg(w.name ORDER BY w.name) FILTER (WHERE w.id IS NOT NULL), '[]'
        ) AS crew_names
      FROM work_days wd
      JOIN jobs j ON j.id = wd.job_id
      LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      LEFT JOIN workers w ON w.id = wdw.worker_id
      WHERE wd.company_id = ${orgId}
        AND wd.date >= ${today}
        AND wd.date <= ${in7Days}
        AND wd.status != 'cancelled'
      GROUP BY wd.id, j.name
      ORDER BY wd.date ASC
      LIMIT 10
    `,
    sql`
      SELECT * FROM activity_logs
      WHERE company_id = ${orgId}
      ORDER BY created_at DESC
      LIMIT 8
    `,
  ])

  const { total_owed, total_billed, total_unbilled, active_count } = kpis[0]

  const dayLabel = (dateStr: string) => {
    const d    = new Date(dateStr + 'T00:00:00')
    const t    = new Date(today + 'T00:00:00')
    const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{greeting()}</h1>
        <p className="text-sm text-gray-400 mt-0.5">Here&apos;s what&apos;s going on</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<HardHat size={15} className="text-orange-500" />} label="In Progress" value={String(active_count)} />
        {canViewFinancials && <>
          <KpiCard icon={<AlertCircle size={15} className="text-red-500" />}  label="Outstanding" value={formatCurrency(Number(total_owed))}     valueClass={Number(total_owed) > 0 ? 'text-red-600' : 'text-green-600'} />
          <KpiCard icon={<TrendingUp size={15} className="text-blue-500" />}  label="Billed"      value={formatCurrency(Number(total_billed))} />
          <KpiCard icon={<DollarSign size={15} className="text-amber-500" />} label="Unbilled"    value={formatCurrency(Number(total_unbilled))} valueClass={Number(total_unbilled) > 0 ? 'text-amber-600' : 'text-gray-900'} />
        </>}
      </div>

      {/* Upcoming work days */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar size={13} /> Next 7 Days
          </h2>
          <Link href="/calendar" className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
            Calendar <ArrowRight size={12} />
          </Link>
        </div>
        {upcomingDays.length === 0 ? (
          <Card><CardBody><p className="text-sm text-gray-400 text-center py-3">No work days scheduled this week</p></CardBody></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingDays.map((wd) => {
              const crew: string[] = Array.isArray(wd.crew_names) ? wd.crew_names : []
              return (
                <WorkDayCard
                  key={wd.id}
                  id={String(wd.id)}
                  jobId={String(wd.job_id)}
                  jobName={String(wd.job_name)}
                  dateLabel={dayLabel(String(wd.date))}
                  crew={crew}
                  initialStatus={(wd.status as any) ?? 'planned'}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Active jobs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">In Progress</h2>
          <Link href="/jobs" className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {activeJobs.length === 0 ? (
          <Card><CardBody><p className="text-sm text-gray-400 text-center py-4">No jobs in progress</p></CardBody></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {(activeJobs as any[]).map((job) => (
              <JobCard key={job.id} job={job} showFinancials={canViewFinancials} canEdit={canEdit} />
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Activity</h2>
            <Link href="/activity" className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <Card>
            <CardBody className="py-1">
              <ActivityFeed logs={recentActivity as any[]} showJobName />
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, valueClass = 'text-gray-900', sub }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string; sub?: string
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{icon}{label}</div>
        <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </CardBody>
    </Card>
  )
}
