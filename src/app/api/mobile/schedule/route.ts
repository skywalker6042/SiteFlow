import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params required (YYYY-MM-DD)' }, { status: 400 })
  }

  const rows = await sql`
    SELECT
      wd.id,
      wd.date,
      wd.status,
      wd.job_id,
      j.name AS job_name,
      COALESCE(
        json_agg(jsonb_build_object('id', w.id, 'name', w.name) ORDER BY w.name)
        FILTER (WHERE w.id IS NOT NULL),
        '[]'
      ) AS workers
    FROM work_days wd
    JOIN jobs j ON j.id = wd.job_id
    LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
    LEFT JOIN workers w ON w.id = wdw.worker_id
    WHERE wd.company_id = ${user.orgId}
      AND wd.date >= ${start}
      AND wd.date <= ${end}
    GROUP BY wd.id, j.name
    ORDER BY wd.date ASC, j.name ASC
  `

  return NextResponse.json({ workDays: rows })
}
