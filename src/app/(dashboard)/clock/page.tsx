import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ClockWidget } from '@/components/clock/ClockWidget'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClockPage() {
  const user  = await getSessionUser()
  const orgId = user.effectiveOrgId!
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'

  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS track_worker_time BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS track_worker_job  BOOLEAN NOT NULL DEFAULT false
  `
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

  const [org] = await sql`
    SELECT track_worker_time, track_worker_job FROM organizations WHERE id = ${orgId}
  `
  if (!org?.track_worker_time) redirect('/dashboard')

  const today = new Date().toISOString().slice(0, 10)

  // Open entry for this user
  const [openEntry] = await sql`
    SELECT * FROM worker_time_logs
    WHERE company_id = ${orgId} AND user_id = ${user.id} AND clock_out IS NULL
    ORDER BY clock_in DESC LIMIT 1
  `

  // Today's logs for this user
  const myLogs = await sql`
    SELECT * FROM worker_time_logs
    WHERE company_id = ${orgId} AND user_id = ${user.id} AND date = ${today}
    ORDER BY clock_in ASC
  `

  // Jobs for job selector
  const jobs = org.track_worker_job ? await sql`
    SELECT id, name FROM jobs
    WHERE company_id = ${orgId} AND status = 'in_progress'
    ORDER BY name ASC
  ` : []

  // Owner view: all workers today
  const allLogs = isOwner ? await sql`
    SELECT * FROM worker_time_logs
    WHERE company_id = ${orgId} AND date = ${today}
    ORDER BY clock_in DESC
  ` : []

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Time Clock</h1>
        <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <ClockWidget
        initialOpen={openEntry ? { id: openEntry.id, clock_in: openEntry.clock_in.toISOString(), job_name: openEntry.job_name } : null}
        myLogs={(myLogs as any[]).map(l => ({
          id: l.id,
          clock_in: l.clock_in.toISOString(),
          clock_out: l.clock_out ? l.clock_out.toISOString() : null,
          job_name: l.job_name,
        }))}
        jobs={(jobs as any[]).map(j => ({ id: j.id, name: j.name }))}
        trackJob={!!org.track_worker_job}
      />

      {isOwner && allLogs.length > 0 && (
        <Card>
          <CardHeader><span className="text-sm font-semibold text-gray-700">Today&apos;s Activity</span></CardHeader>
          <CardBody className="flex flex-col gap-2 py-2">
            {(allLogs as any[]).map((log) => {
              const inTime  = new Date(log.clock_in)
              const outTime = log.clock_out ? new Date(log.clock_out) : null
              const mins    = outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null
              return (
                <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{log.worker_name}</p>
                    {log.job_name && <p className="text-xs text-gray-400">{log.job_name}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{inTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {outTime && ` – ${outTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      {!outTime && <span className="text-green-600 font-medium ml-1">Active</span>}
                    </p>
                    {mins !== null && <p className="text-gray-400">{mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`}</p>}
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
