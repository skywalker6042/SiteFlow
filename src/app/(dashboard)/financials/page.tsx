import sql from '@/lib/db'
import { getSessionUser } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import { notFound } from 'next/navigation'
import { FinancialsClient } from '@/components/financials/FinancialsClient'
import { ensureFinancialSettingsColumns, readFinancialSettings } from '@/lib/financial-settings'

export const dynamic = 'force-dynamic'

interface MonthRevenueRow {
  month: number
  contracted: number
  billed: number
  collected: number
}

interface MonthValueRow {
  month: number
  value?: number
  total?: number
  collected?: number
}

interface PipelineRow {
  status: string
  count?: number
  value: number
}

interface OutstandingJobRow {
  id: string
  name: string
  client_name: string | null
  status: string
  total_value: number
  amount_billed: number
  amount_paid: number
  approved_change_orders: number
}

interface WorkerRow {
  name: string
  role: string | null
  hourly_rate: number | null
  total_hours: number
  total_cost: number
}

interface ReceiptCategoryRow {
  category: string
  count: number
  total: number
}

async function ensureReceiptsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id  UUID NOT NULL,
      job_id      UUID,
      image_path  TEXT,
      vendor      TEXT,
      date        DATE,
      subtotal    NUMERIC(10,2),
      tax         NUMERIC(10,2),
      total       NUMERIC(10,2),
      category    TEXT NOT NULL DEFAULT 'Other',
      description TEXT,
      notes       TEXT,
      created_by  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export default async function FinancialsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const user = await getSessionUser()
  const orgId = user.effectiveOrgId!
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  if (!isOwner && !perms.can_view_financials) notFound()
  await ensureFinancialSettingsColumns()
  await ensureReceiptsTable()

  const currentYear = new Date().getFullYear()
  const selectedYear = parseInt(sp.year ?? String(currentYear), 10)
  const [org] = await sql`
    SELECT
      financial_include_labor,
      financial_include_receipts,
      financial_include_change_orders,
      financial_show_labor_breakdown,
      financial_show_receipt_breakdown
    FROM organizations
    WHERE id = ${orgId}
  `
  const financialSettings = readFinancialSettings(org)

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
  const monthlyRows = await sql<MonthRevenueRow[]>`
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
  const changeOrderRows = await sql<MonthValueRow[]>`
    SELECT
      EXTRACT(month FROM co.created_at)::int AS month,
      COALESCE(SUM(co.amount), 0)::float AS value
    FROM change_orders co
    JOIN jobs j ON j.id = co.job_id
    WHERE co.company_id = ${orgId}
      AND co.approved = true
      AND EXTRACT(year FROM co.created_at) = ${selectedYear}
    GROUP BY month
    ORDER BY month
  `
  const changeOrderMap = new Map<number, number>(
    changeOrderRows.map((row) => [Number(row.month), Number(row.value ?? 0)])
  )

  // Fill missing months with zeros
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const row = monthlyRows.find((r) => Number(r.month) === m)
    const changeOrderValue = financialSettings.financial_include_change_orders ? (changeOrderMap.get(m) ?? 0) : 0
    return {
      month: m,
      contracted: row ? Number(row.contracted) + changeOrderValue : changeOrderValue,
      billed:     row ? Number(row.billed)     : 0,
      collected:  row ? Number(row.collected)  : 0,
      changeOrders: changeOrderValue,
    }
  })

  // ── Prior year for comparison ──────────────────────────────────────────────
  const priorYear = selectedYear - 1
  const priorRows = await sql<MonthValueRow[]>`
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
    const row = priorRows.find((r) => Number(r.month) === m)
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
  const [changeOrderKpis] = await sql`
    SELECT
      COALESCE(SUM(co.amount), 0)::float AS approved_value,
      COALESCE(SUM(co.amount) FILTER (WHERE j.status = 'done'), 0)::float AS approved_done,
      COALESCE(SUM(co.amount) FILTER (WHERE j.status = 'in_progress'), 0)::float AS approved_active
    FROM change_orders co
    JOIN jobs j ON j.id = co.job_id
    WHERE co.company_id = ${orgId}
      AND co.approved = true
      AND EXTRACT(year FROM co.created_at) = ${selectedYear}
  `

  // ── Job pipeline (all time) ────────────────────────────────────────────────
  const pipeline = await sql<PipelineRow[]>`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(total_value), 0)::float AS value
    FROM jobs WHERE company_id = ${orgId}
    GROUP BY status
  `
  const pipelineChangeOrders = await sql<PipelineRow[]>`
    SELECT j.status, COALESCE(SUM(co.amount), 0)::float AS value
    FROM change_orders co
    JOIN jobs j ON j.id = co.job_id
    WHERE co.company_id = ${orgId}
      AND co.approved = true
    GROUP BY j.status
  `
  const pipelineChangeOrderMap = new Map<string, number>(
    pipelineChangeOrders.map((row) => [String(row.status), Number(row.value ?? 0)])
  )

  // ── All outstanding jobs ───────────────────────────────────────────────────
  const outstandingJobs = await sql<OutstandingJobRow[]>`
    SELECT
      j.id,
      j.name,
      j.client_name,
      j.status,
      j.total_value,
      j.amount_billed,
      j.amount_paid,
      COALESCE(SUM(co.amount) FILTER (WHERE co.approved = true), 0)::float AS approved_change_orders
    FROM jobs j
    LEFT JOIN change_orders co ON co.job_id = j.id
    WHERE j.company_id = ${orgId} AND j.total_value > j.amount_paid
    GROUP BY j.id
    ORDER BY (j.total_value + COALESCE(SUM(co.amount) FILTER (WHERE co.approved = true), 0) - j.amount_paid) DESC
  `

  // ── Labor cost by month (selected year) ───────────────────────────────────
  const laborRows = await sql<{ month: number; labor_cost: number; total_hours: number }[]>`
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
    const row = laborRows.find((r) => Number(r.month) === m)
    return {
      month: m,
      labor_cost:  row ? Number(row.labor_cost)  : 0,
      total_hours: row ? Number(row.total_hours) : 0,
    }
  })
  const receiptRows = await sql<MonthValueRow[]>`
    SELECT
      EXTRACT(month FROM COALESCE(r.date::timestamptz, r.created_at))::int AS month,
      COALESCE(SUM(r.total), 0)::float AS total
    FROM receipts r
    WHERE r.company_id = ${orgId}
      AND EXTRACT(year FROM COALESCE(r.date::timestamptz, r.created_at)) = ${selectedYear}
    GROUP BY month
    ORDER BY month
  `
  const receiptData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const row = receiptRows.find((r) => Number(r.month) === m)
    return {
      month: m,
      total: row ? Number(row.total) : 0,
    }
  })
  const receiptCategories = await sql<ReceiptCategoryRow[]>`
    SELECT
      COALESCE(NULLIF(TRIM(category), ''), 'Other') AS category,
      COUNT(*)::int AS count,
      COALESCE(SUM(total), 0)::float AS total
    FROM receipts
    WHERE company_id = ${orgId}
      AND EXTRACT(year FROM COALESCE(date::timestamptz, created_at)) = ${selectedYear}
    GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'Other')
    ORDER BY total DESC, category ASC
    LIMIT 6
  `

  // ── Top workers by hours (selected year) ──────────────────────────────────
  const topWorkers = await sql<WorkerRow[]>`
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
  const totalLaborCost = laborData.reduce((sum, row) => sum + row.labor_cost, 0)
  const totalReceiptCost = receiptData.reduce((sum, row) => sum + row.total, 0)
  const includedLaborCost = financialSettings.financial_include_labor ? totalLaborCost : 0
  const includedReceiptCost = financialSettings.financial_include_receipts ? totalReceiptCost : 0
  const includedTrackedCosts = includedLaborCost + includedReceiptCost
  const approvedChangeOrderValue = financialSettings.financial_include_change_orders ? Number(changeOrderKpis?.approved_value ?? 0) : 0
  const totalContracted = Number(kpis?.total_contracted ?? 0) + approvedChangeOrderValue
  const totalBilled = Number(kpis?.total_billed ?? 0)
  const totalPaid = Number(kpis?.total_paid ?? 0)

  return (
    <FinancialsClient
      selectedYear={selectedYear}
      minYear={minYear}
      maxYear={maxYear}
      monthlyData={monthlyData}
      priorData={priorData}
      financialSettings={financialSettings}
      kpis={{
        total_contracted: totalContracted,
        total_billed:     totalBilled,
        total_paid:       totalPaid,
        jobs_done:        Number(kpis?.jobs_done ?? 0),
        jobs_active:      Number(kpis?.jobs_active ?? 0),
        jobs_pending:     Number(kpis?.jobs_pending ?? 0),
        revenue_done:     Number(kpis?.revenue_done ?? 0) + (financialSettings.financial_include_change_orders ? Number(changeOrderKpis?.approved_done ?? 0) : 0),
        revenue_active:   Number(kpis?.revenue_active ?? 0) + (financialSettings.financial_include_change_orders ? Number(changeOrderKpis?.approved_active ?? 0) : 0),
      }}
      pipeline={pipeline.map((p) => ({
        status: p.status,
        count: Number(p.count),
        value: Number(p.value) + (financialSettings.financial_include_change_orders ? (pipelineChangeOrderMap.get(String(p.status)) ?? 0) : 0),
      }))}
      outstandingJobs={outstandingJobs.map((j) => ({
        id: j.id, name: j.name, client_name: j.client_name, status: j.status,
        total_value: Number(j.total_value) + (financialSettings.financial_include_change_orders ? Number(j.approved_change_orders ?? 0) : 0),
        amount_billed: Number(j.amount_billed), amount_paid: Number(j.amount_paid),
      }))}
      laborData={laborData}
      receiptData={receiptData}
      receiptCategories={receiptCategories.map((row) => ({
        category: String(row.category),
        count: Number(row.count),
        total: Number(row.total),
      }))}
      trackedCosts={{
        labor: totalLaborCost,
        receipts: totalReceiptCost,
        includedLabor: includedLaborCost,
        includedReceipts: includedReceiptCost,
        totalIncluded: includedTrackedCosts,
        approvedChangeOrders: approvedChangeOrderValue,
        estimatedNet: totalPaid - includedTrackedCosts,
      }}
      topWorkers={topWorkers.map((w) => ({
        name: w.name, role: w.role,
        hourly_rate: w.hourly_rate ? Number(w.hourly_rate) : null,
        total_hours: Number(w.total_hours),
        total_cost:  Number(w.total_cost),
      }))}
    />
  )
}
