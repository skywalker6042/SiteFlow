import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { notFound } from 'next/navigation'
import { FinancialsClient } from '@/components/financials/FinancialsClient'

export const dynamic = 'force-dynamic'

export default async function FinancialsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const user = await getSessionUser()
  const orgId = user.effectiveOrgId!
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  if (!isOwner && !perms.can_view_financials) notFound()

  const currentYear = new Date().getFullYear()
  const selectedYear = parseInt(sp.year ?? String(currentYear), 10)

  // Year range available
  const [yearRange] = await sql`
    SELECT
      EXTRACT(year FROM MIN(COALESCE(start_date::timestamptz, created_at)))::int AS min_year,
      EXTRACT(year FROM MAX(COALESCE(start_date::timestamptz, created_at)))::int AS max_year
    FROM jobs WHERE company_id = ${orgId}
  `
  const minYear = yearRange?.min_year ?? currentYear
  const maxYear = Math.max(yearRange?.max_year ?? currentYear, currentYear)

  // ── Monthly revenue for selected year ─────────────────────────────────────
  const monthlyRows = await sql`
    SELECT
      EXTRACT(month FROM COALESCE(start_date::timestamptz, created_at))::int AS month,
      COALESCE(SUM(total_value),    0)::float AS contracted,
      COALESCE(SUM(amount_billed),  0)::float AS billed,
      COALESCE(SUM(amount_paid),    0)::float AS collected
    FROM jobs
    WHERE company_id = ${orgId}
      AND EXTRACT(year FROM COALESCE(start_date::timestamptz, created_at)) = ${selectedYear}
    GROUP BY month ORDER BY month
  `

  // Fill missing months with zeros
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const row = monthlyRows.find((r: any) => r.month === m)
    return {
      month: m,
      contracted: row ? Number(row.contracted) : 0,
      billed:     row ? Number(row.billed)     : 0,
      collected:  row ? Number(row.collected)  : 0,
    }
  })

  // ── Prior year for comparison ──────────────────────────────────────────────
  const priorYear = selectedYear - 1
  const priorRows = await sql`
    SELECT
      EXTRACT(month FROM COALESCE(start_date::timestamptz, created_at))::int AS month,
      COALESCE(SUM(amount_paid), 0)::float AS collected
    FROM jobs
    WHERE company_id = ${orgId}
      AND EXTRACT(year FROM COALESCE(start_date::timestamptz, created_at)) = ${priorYear}
    GROUP BY month ORDER BY month
  `
  const priorData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const row = priorRows.find((r: any) => r.month === m)
    return { month: m, collected: row ? Number(row.collected) : 0 }
  })

  // ── Overall KPIs ───────────────────────────────────────────────────────────
  const [kpis] = await sql`
    SELECT
      COALESCE(SUM(total_value),   0)::float AS total_contracted,
      COALESCE(SUM(amount_billed), 0)::float AS total_billed,
      COALESCE(SUM(amount_paid),   0)::float AS total_paid,
      COUNT(*) FILTER (WHERE status = 'done')         AS jobs_done,
      COUNT(*) FILTER (WHERE status = 'in_progress')  AS jobs_active,
      COUNT(*) FILTER (WHERE status = 'not_started')  AS jobs_pending,
      COALESCE(SUM(total_value) FILTER (WHERE status = 'done'),        0)::float AS revenue_done,
      COALESCE(SUM(total_value) FILTER (WHERE status = 'in_progress'), 0)::float AS revenue_active
    FROM jobs WHERE company_id = ${orgId}
      AND EXTRACT(year FROM COALESCE(start_date::timestamptz, created_at)) = ${selectedYear}
  `

  // ── Job pipeline (all time) ────────────────────────────────────────────────
  const pipeline = await sql`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(total_value), 0)::float AS value
    FROM jobs WHERE company_id = ${orgId}
    GROUP BY status
  `

  // ── All outstanding jobs ───────────────────────────────────────────────────
  const outstandingJobs = await sql`
    SELECT id, name, client_name, status, total_value, amount_billed, amount_paid
    FROM jobs
    WHERE company_id = ${orgId} AND total_value > amount_paid
    ORDER BY (total_value - amount_paid) DESC
  `

  // ── Labor cost by month (selected year) ───────────────────────────────────
  const laborRows = await sql`
    SELECT
      EXTRACT(month FROM wd.date)::int AS month,
      COALESCE(SUM(wdw.hours * w.hourly_rate), 0)::float AS labor_cost,
      COALESCE(SUM(wdw.hours), 0)::float AS total_hours
    FROM work_days wd
    JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
    JOIN workers w ON w.id = wdw.worker_id
    WHERE wd.company_id = ${orgId}
      AND EXTRACT(year FROM wd.date) = ${selectedYear}
      AND wdw.hours IS NOT NULL
      AND w.hourly_rate IS NOT NULL
    GROUP BY month ORDER BY month
  `
  const laborData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const row = laborRows.find((r: any) => r.month === m)
    return {
      month: m,
      labor_cost:  row ? Number(row.labor_cost)  : 0,
      total_hours: row ? Number(row.total_hours) : 0,
    }
  })

  // ── Top workers by hours (selected year) ──────────────────────────────────
  const topWorkers = await sql`
    SELECT
      w.name, w.role, w.hourly_rate,
      COALESCE(SUM(wdw.hours), 0)::float           AS total_hours,
      COALESCE(SUM(wdw.hours * w.hourly_rate), 0)::float AS total_cost
    FROM workers w
    JOIN work_day_workers wdw ON wdw.worker_id = w.id
    JOIN work_days wd ON wd.id = wdw.work_day_id
    WHERE w.company_id = ${orgId}
      AND EXTRACT(year FROM wd.date) = ${selectedYear}
      AND wdw.hours IS NOT NULL
    GROUP BY w.id
    ORDER BY total_hours DESC
    LIMIT 12
  `

  return (
    <FinancialsClient
      selectedYear={selectedYear}
      minYear={minYear}
      maxYear={maxYear}
      monthlyData={monthlyData}
      priorData={priorData}
      kpis={{
        total_contracted: Number(kpis?.total_contracted ?? 0),
        total_billed:     Number(kpis?.total_billed ?? 0),
        total_paid:       Number(kpis?.total_paid ?? 0),
        jobs_done:        Number(kpis?.jobs_done ?? 0),
        jobs_active:      Number(kpis?.jobs_active ?? 0),
        jobs_pending:     Number(kpis?.jobs_pending ?? 0),
        revenue_done:     Number(kpis?.revenue_done ?? 0),
        revenue_active:   Number(kpis?.revenue_active ?? 0),
      }}
      pipeline={pipeline.map((p: any) => ({ status: p.status, count: Number(p.count), value: Number(p.value) }))}
      outstandingJobs={outstandingJobs.map((j: any) => ({
        id: j.id, name: j.name, client_name: j.client_name, status: j.status,
        total_value: Number(j.total_value), amount_billed: Number(j.amount_billed), amount_paid: Number(j.amount_paid),
      }))}
      laborData={laborData}
      topWorkers={topWorkers.map((w: any) => ({
        name: w.name, role: w.role,
        hourly_rate: w.hourly_rate ? Number(w.hourly_rate) : null,
        total_hours: Number(w.total_hours),
        total_cost:  Number(w.total_cost),
      }))}
    />
  )
}
