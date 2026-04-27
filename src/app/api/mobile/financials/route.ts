import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { DEFAULT_WORKER_PERMISSIONS, type UserPermissions } from '@/lib/permissions'
import { getMobileSessionUser } from '@/lib/mobile-auth'
import { ensureFinancialSettingsColumns, readFinancialSettings } from '@/lib/financial-settings'

interface FinancialSummaryRow {
  contracted: number
  billed: number
  collected: number
  jobs_done: number
  jobs_active: number
  jobs_pending: number
}

interface FinancialMonthRow {
  month: number
  contracted?: number
  billed?: number
  collected?: number
  value?: number
  total?: number
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

interface ReceiptCategoryRow {
  category: string
  count: number
  total: number
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

export async function GET() {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  if (!isOwner && !perms.can_view_financials) return forbidden()

  await ensureFinancialSettingsColumns()
  await ensureReceiptsTable()

  const currentYear = new Date().getFullYear()
  const [orgRow] = await sql`
    SELECT
      financial_include_labor,
      financial_include_receipts,
      financial_include_change_orders,
      financial_show_labor_breakdown,
      financial_show_receipt_breakdown
    FROM organizations
    WHERE id = ${user.orgId}
  `
  const financialSettings = readFinancialSettings(orgRow)

  const [kpisRow] = await sql<FinancialSummaryRow[]>`
    SELECT
      COALESCE(SUM(total_value), 0)::float AS contracted,
      COALESCE(SUM(amount_billed), 0)::float AS billed,
      COALESCE(SUM(amount_paid), 0)::float AS collected,
      COUNT(*) FILTER (WHERE status = 'done')::int AS jobs_done,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS jobs_active,
      COUNT(*) FILTER (WHERE status = 'not_started')::int AS jobs_pending
    FROM jobs
    WHERE company_id = ${user.orgId}
      AND EXTRACT(year FROM COALESCE(start_date::timestamptz, created_at)) = ${currentYear}
  `

  const [changeOrderRow] = await sql<{ approved_value: number }[]>`
    SELECT COALESCE(SUM(amount), 0)::float AS approved_value
    FROM change_orders
    WHERE company_id = ${user.orgId}
      AND approved = true
      AND EXTRACT(year FROM created_at) = ${currentYear}
  `

  const outstandingRows = await sql<OutstandingJobRow[]>`
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
    WHERE j.company_id = ${user.orgId}
      AND COALESCE(j.total_value, 0) > COALESCE(j.amount_paid, 0)
    GROUP BY j.id
    ORDER BY (COALESCE(j.total_value, 0) + COALESCE(SUM(co.amount) FILTER (WHERE co.approved = true), 0) - COALESCE(j.amount_paid, 0)) DESC, j.name ASC
    LIMIT 12
  `

  const monthlyRows = await sql<FinancialMonthRow[]>`
    SELECT
      EXTRACT(month FROM COALESCE(start_date::timestamptz, created_at))::int AS month,
      COALESCE(SUM(total_value), 0)::float AS contracted,
      COALESCE(SUM(amount_billed), 0)::float AS billed,
      COALESCE(SUM(amount_paid), 0)::float AS collected
    FROM jobs
    WHERE company_id = ${user.orgId}
      AND EXTRACT(year FROM COALESCE(start_date::timestamptz, created_at)) = ${currentYear}
    GROUP BY month
    ORDER BY month ASC
  `

  const changeOrderMonths = await sql<FinancialMonthRow[]>`
    SELECT
      EXTRACT(month FROM created_at)::int AS month,
      COALESCE(SUM(amount), 0)::float AS value
    FROM change_orders
    WHERE company_id = ${user.orgId}
      AND approved = true
      AND EXTRACT(year FROM created_at) = ${currentYear}
    GROUP BY month
    ORDER BY month ASC
  `

  const laborRows = await sql<{ month: number; labor_cost: number; total_hours: number }[]>`
    SELECT
      EXTRACT(month FROM wd.date)::int AS month,
      COALESCE(SUM(wdw.hours * w.hourly_rate), 0)::float AS labor_cost,
      COALESCE(SUM(wdw.hours), 0)::float AS total_hours
    FROM work_days wd
    JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
    JOIN workers w ON w.id = wdw.worker_id
    WHERE wd.company_id = ${user.orgId}
      AND EXTRACT(year FROM wd.date) = ${currentYear}
      AND wdw.hours IS NOT NULL
      AND w.hourly_rate IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
  `

  const receiptRows = await sql<FinancialMonthRow[]>`
    SELECT
      EXTRACT(month FROM COALESCE(date::timestamptz, created_at))::int AS month,
      COALESCE(SUM(total), 0)::float AS total
    FROM receipts
    WHERE company_id = ${user.orgId}
      AND EXTRACT(year FROM COALESCE(date::timestamptz, created_at)) = ${currentYear}
    GROUP BY month
    ORDER BY month ASC
  `

  const receiptCategories = await sql<ReceiptCategoryRow[]>`
    SELECT
      COALESCE(NULLIF(TRIM(category), ''), 'Other') AS category,
      COUNT(*)::int AS count,
      COALESCE(SUM(total), 0)::float AS total
    FROM receipts
    WHERE company_id = ${user.orgId}
      AND EXTRACT(year FROM COALESCE(date::timestamptz, created_at)) = ${currentYear}
    GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'Other')
    ORDER BY total DESC, category ASC
    LIMIT 6
  `

  const monthMap = new Map<number, FinancialMonthRow>(monthlyRows.map((row) => [Number(row.month), row]))
  const changeOrderMap = new Map<number, FinancialMonthRow>(changeOrderMonths.map((row) => [Number(row.month), row]))
  const laborMap = new Map<number, { labor_cost: number; total_hours: number }>(laborRows.map((row) => [Number(row.month), row]))
  const receiptMap = new Map<number, FinancialMonthRow>(receiptRows.map((row) => [Number(row.month), row]))

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const row = monthMap.get(month)
    const changeOrderValue = financialSettings.financial_include_change_orders ? Number(changeOrderMap.get(month)?.value ?? 0) : 0
    const laborCost = Number(laborMap.get(month)?.labor_cost ?? 0)
    const laborHours = Number(laborMap.get(month)?.total_hours ?? 0)
    const receiptTotal = Number(receiptMap.get(month)?.total ?? 0)
    const trackedCosts =
      (financialSettings.financial_include_labor ? laborCost : 0) +
      (financialSettings.financial_include_receipts ? receiptTotal : 0)

    return {
      month,
      contracted: Number(row?.contracted ?? 0) + changeOrderValue,
      billed: Number(row?.billed ?? 0),
      collected: Number(row?.collected ?? 0),
      changeOrders: changeOrderValue,
      laborCost,
      laborHours,
      receipts: receiptTotal,
      trackedCosts,
      netCollected: Number(row?.collected ?? 0) - trackedCosts,
    }
  })

  const contracted = Number(kpisRow?.contracted ?? 0) + (financialSettings.financial_include_change_orders ? Number(changeOrderRow?.approved_value ?? 0) : 0)
  const billed = Number(kpisRow?.billed ?? 0)
  const collected = Number(kpisRow?.collected ?? 0)
  const totalLabor = laborRows.reduce((sum, row) => sum + Number(row.labor_cost ?? 0), 0)
  const totalLaborHours = laborRows.reduce((sum, row) => sum + Number(row.total_hours ?? 0), 0)
  const totalReceipts = receiptRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0)
  const includedLabor = financialSettings.financial_include_labor ? totalLabor : 0
  const includedReceipts = financialSettings.financial_include_receipts ? totalReceipts : 0
  const trackedCosts = includedLabor + includedReceipts

  return NextResponse.json({
    year: currentYear,
    settings: {
      includeLabor: financialSettings.financial_include_labor,
      includeReceipts: financialSettings.financial_include_receipts,
      includeChangeOrders: financialSettings.financial_include_change_orders,
      showLaborBreakdown: financialSettings.financial_show_labor_breakdown,
      showReceiptBreakdown: financialSettings.financial_show_receipt_breakdown,
    },
    summary: {
      contracted,
      billed,
      collected,
      outstanding: contracted - collected,
      unbilled: contracted - billed,
      jobsDone: Number(kpisRow?.jobs_done ?? 0),
      jobsActive: Number(kpisRow?.jobs_active ?? 0),
      jobsPending: Number(kpisRow?.jobs_pending ?? 0),
      trackedCosts,
      estimatedNet: collected - trackedCosts,
      laborCost: totalLabor,
      laborHours: totalLaborHours,
      receiptTotal: totalReceipts,
      approvedChangeOrders: financialSettings.financial_include_change_orders ? Number(changeOrderRow?.approved_value ?? 0) : 0,
    },
    months,
    receiptCategories: receiptCategories.map((row) => ({
      category: row.category,
      count: Number(row.count),
      total: Number(row.total),
    })),
    outstandingJobs: outstandingRows.map((row) => ({
      id: row.id,
      name: row.name,
      clientName: row.client_name ?? null,
      status: row.status,
      totalValue: Number(row.total_value ?? 0) + (financialSettings.financial_include_change_orders ? Number(row.approved_change_orders ?? 0) : 0),
      amountBilled: Number(row.amount_billed ?? 0),
      amountPaid: Number(row.amount_paid ?? 0),
    })),
  })
}
