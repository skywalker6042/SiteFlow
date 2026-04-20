import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { DEFAULT_WORKER_PERMISSIONS, type UserPermissions } from '@/lib/permissions'
import { ALL_FEATURES, DEFAULT_PLAN_FEATURES, type FeatureKey, type PlanTier } from '@/lib/plan-features'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET() {
  const user = await getMobileSessionUser()
  if (!user) return unauthorized()

  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const resolvedOrgId = user.orgId

  if (user.platformRole === 'admin' || !resolvedOrgId) {
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        platformRole: user.platformRole,
        role: user.role,
        permissions: perms,
      },
      org: null,
      dashboard: null,
      jobs: [],
      workers: [],
      calendar: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, workDays: [] },
      settings: null,
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

  const org = orgRows[0]
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
      activeJobs: jobRows.filter((job) => job.status === 'in_progress').slice(0, 5),
      upcomingDays: upcomingRows,
    },
    jobs: jobRows,
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
    },
  })
}
