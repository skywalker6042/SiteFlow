import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import type { WorkDayWithJob } from '@/types'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay  = new Date(year, month, 0).toISOString().slice(0, 10)

  const orgId = await getOrgId()
  const sessions = await sql`
    SELECT
      wd.id, wd.job_id, wd.company_id,
      wd.date, wd.status, wd.notes, wd.start_time, wd.end_time, wd.created_at,
      j.name   AS job_name,
      j.status AS job_status,
      COALESCE(
        json_agg(
          jsonb_build_object('id', w.id, 'name', w.name)
          ORDER BY w.name
        ) FILTER (WHERE w.id IS NOT NULL),
        '[]'
      ) AS workers
    FROM work_days wd
    JOIN jobs j ON j.id = wd.job_id
    LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
    LEFT JOIN workers w ON w.id = wdw.worker_id
    WHERE wd.company_id = ${orgId}
      AND wd.date >= ${firstDay}
      AND wd.date <= ${lastDay}
    GROUP BY wd.id, j.name, j.status
    ORDER BY wd.date ASC, j.name ASC
  ` as unknown as WorkDayWithJob[]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
      <CalendarGrid
        initialSessions={sessions}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  )
}
