import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { DEFAULT_WORKER_PERMISSIONS, type UserPermissions } from '@/lib/permissions'
import { DEFAULT_PLAN_FEATURES, type FeatureKey, type PlanTier } from '@/lib/plan-features'
import { getMobileSessionUser } from '@/lib/mobile-auth'
import { ensureFinancialSettingsColumns, readFinancialSettings } from '@/lib/financial-settings'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET() {
  const user = await getMobileSessionUser()
  if (!user) return unauthorized()
  await ensureFinancialSettingsColumns()

  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const resolvedOrgId = user.orgId

  if (!resolvedOrgId) {
    const adminPortal = user.platformRole === 'admin'
      ? await (async () => {
          const orgs = await sql`
            SELECT
              o.id,
              o.name,
              o.status,
              o.plan,
              COUNT(DISTINCT om.id)::int AS member_count,
              COUNT(DISTINCT j.id)::int AS job_count
            FROM organizations o
            LEFT JOIN org_members om ON om.org_id = o.id
            LEFT JOIN jobs j ON j.company_id = o.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 50
          `

          return {
            counts: {
              total: orgs.length,
              active: orgs.filter((org) => org.status === 'active').length,
              trial: orgs.filter((org) => org.status === 'trial').length,
              suspended: orgs.filter((org) => org.status === 'suspended').length,
            },
            orgs: orgs.map((org) => ({
              id: org.id,
              name: org.name,
              status: org.status,
              plan: org.plan ?? 'trial',
              memberCount: Number(org.member_count ?? 0),
              jobCount: Number(org.job_count ?? 0),
            })),
          }
        })()
      : null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        platformRole: user.platformRole,
        role: user.role,
        permissions: perms,
        workerId: user.workerId ?? null,
      },
      org: null,
      dashboard: null,
      jobs: [],
      workers: [],
      calendar: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, workDays: [] },
      settings: null,
      adminPortal,
    })
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = now.toISOString().slice(0, 10)
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)

  const [orgRows, kpiRows, jobRows, upcomingRows, workerRows, calendarRows] = await Promise.all([
    sql`
      SELECT
        name,
        logo_url,
        phone,
        status,
        track_worker_time,
        co_separate_invoice,
        require_signature,
        track_worker_job,
        financial_include_labor,
        financial_include_receipts,
        financial_include_change_orders,
        financial_show_labor_breakdown,
        financial_show_receipt_breakdown,
        plan
      FROM organizations
      WHERE id = ${resolvedOrgId}
      LIMIT 1
    `,
    (isOwner || perms.can_view_job_financials) ? sql`
      SELECT
        COALESCE(SUM(total_value - amount_paid), 0) AS total_owed,
        COALESCE(SUM(amount_billed), 0) AS total_billed,
        COALESCE(SUM(total_value - amount_billed), 0) AS total_unbilled,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS active_count
      FROM jobs
      WHERE company_id = ${resolvedOrgId}
    ` : sql`
      SELECT COUNT(*) FILTER (WHERE status = 'in_progress') AS active_count
      FROM jobs
      WHERE company_id = ${resolvedOrgId}
    `,
    (isOwner || perms.can_view_all_jobs) ? sql`
      SELECT id, name, client_name, address, status, percent_complete, total_value, amount_paid
      FROM jobs
      WHERE company_id = ${resolvedOrgId}
      ORDER BY created_at DESC
    ` : sql`
      SELECT DISTINCT
        j.id, j.name, j.client_name, j.address, j.status, j.percent_complete, j.total_value, j.amount_paid
      FROM jobs j
      JOIN work_days wd ON wd.job_id = j.id AND wd.company_id = ${resolvedOrgId}
      JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      JOIN org_members om ON om.worker_id = wdw.worker_id AND om.org_id = ${resolvedOrgId} AND om.user_id = ${user.id}
      WHERE j.company_id = ${resolvedOrgId}
      ORDER BY j.name ASC
    `,
    sql`
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
      WHERE wd.company_id = ${resolvedOrgId}
        AND wd.date >= ${today}
        AND wd.date <= ${in7Days}
        AND wd.status != 'cancelled'
      GROUP BY wd.id, j.name
      ORDER BY wd.date ASC
      LIMIT 10
    `,
    sql`
      SELECT
        w.id,
        w.name,
        w.phone,
        w.role,
        u.email AS login_email,
        r.name AS role_name,
        r.color AS role_color,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name))
          FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) AS specialties
      FROM workers w
      LEFT JOIN worker_specialties ws ON ws.worker_id = w.id
      LEFT JOIN specialties s ON s.id = ws.specialty_id
      LEFT JOIN org_members om ON om.worker_id = w.id AND om.org_id = ${resolvedOrgId}
      LEFT JOIN org_roles r ON r.id = om.org_role_id
      LEFT JOIN users u ON u.id = om.user_id
      WHERE w.company_id = ${resolvedOrgId}
      GROUP BY w.id, u.email, r.name, r.color
      ORDER BY w.name
    `,
    sql`
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
      WHERE wd.company_id = ${resolvedOrgId}
        AND wd.date >= ${firstDay}
        AND wd.date <= ${lastDay}
      GROUP BY wd.id, j.name
      ORDER BY wd.date ASC, j.name ASC
    `,
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toJobSummary = (j: any) => ({
    id: j.id,
    name: j.name,
    clientName: j.client_name ?? null,
    address: j.address ?? null,
    status: j.status,
    percentComplete: Number(j.percent_complete),
    totalValue: j.total_value != null ? Number(j.total_value) : null,
    amountPaid: j.amount_paid != null ? Number(j.amount_paid) : null,
  })

  const org = orgRows[0]
  const financialSettings = readFinancialSettings(org)
  const kpis = kpiRows[0] ?? {}
  const plan = ((org?.plan ?? 'trial') as PlanTier)
  const planFeatureRows = await sql`SELECT value FROM platform_settings WHERE key = ${'plan_features_' + plan}` as Array<{ value: string }>

  const enabledFeatures: FeatureKey[] = planFeatureRows[0]?.value
    ? JSON.parse(planFeatureRows[0].value)
    : DEFAULT_PLAN_FEATURES[plan]

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      platformRole: user.platformRole,
      role: user.role,
      permissions: perms,
      isOwner,
      workerId: user.workerId ?? null,
    },
    org: {
      name: org?.name ?? 'SiteFlo',
      logoUrl: org?.logo_url ?? null,
      status: org?.status ?? 'trial',
      phone: org?.phone ?? null,
      trackWorkerTime: !!org?.track_worker_time,
      plan,
      enabledFeatures,
    },
    dashboard: {
      activeCount: Number((kpis as { active_count?: number }).active_count ?? 0),
      totalOwed: Number((kpis as { total_owed?: number }).total_owed ?? 0),
      totalBilled: Number((kpis as { total_billed?: number }).total_billed ?? 0),
      totalUnbilled: Number((kpis as { total_unbilled?: number }).total_unbilled ?? 0),
      activeJobs: jobRows.filter((job) => job.status === 'in_progress').slice(0, 5).map(toJobSummary),
      upcomingDays: upcomingRows,
    },
    jobs: jobRows.map(toJobSummary),
    workers: workerRows,
    calendar: {
      year,
      month,
      workDays: calendarRows,
    },
    settings: {
      companyName: org?.name ?? 'SiteFlo',
      companyPhone: org?.phone ?? null,
      coSeparateInvoice: !!org?.co_separate_invoice,
      requireSignature: !!org?.require_signature,
      trackWorkerTime: !!org?.track_worker_time,
      trackWorkerJob: !!org?.track_worker_job,
      financialIncludeLabor: financialSettings.financial_include_labor,
      financialIncludeReceipts: financialSettings.financial_include_receipts,
      financialIncludeChangeOrders: financialSettings.financial_include_change_orders,
      financialShowLaborBreakdown: financialSettings.financial_show_labor_breakdown,
      financialShowReceiptBreakdown: financialSettings.financial_show_receipt_breakdown,
    },
    adminPortal: null,
  })
}
