import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { DEFAULT_WORKER_PERMISSIONS, type UserPermissions } from '@/lib/permissions'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function GET() {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  if (!isOwner && !perms.can_view_financials) return forbidden()

  const currentYear = new Date().getFullYear()

  const [kpisRow] = await sql`
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

  const outstandingRows = await sql`
    SELECT id, name, client_name, status, total_value, amount_billed, amount_paid
    FROM jobs
    WHERE company_id = ${user.orgId}
      AND COALESCE(total_value, 0) > COALESCE(amount_paid, 0)
    ORDER BY (COALESCE(total_value, 0) - COALESCE(amount_paid, 0)) DESC, name ASC
    LIMIT 12
  `

  const monthlyRows = await sql`
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

  const monthMap = new Map<number, Record<string, unknown>>(
    monthlyRows.map((row) => [Number(row.month), row as Record<string, unknown>])
  )

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const row = monthMap.get(month)
    return {
      month,
      contracted: row ? Number(row.contracted ?? 0) : 0,
      billed: row ? Number(row.billed ?? 0) : 0,
      collected: row ? Number(row.collected ?? 0) : 0,
    }
  })

  const contracted = Number(kpisRow?.contracted ?? 0)
  const billed = Number(kpisRow?.billed ?? 0)
  const collected = Number(kpisRow?.collected ?? 0)

  return NextResponse.json({
    year: currentYear,
    summary: {
      contracted,
      billed,
      collected,
      outstanding: contracted - collected,
      unbilled: contracted - billed,
      jobsDone: Number(kpisRow?.jobs_done ?? 0),
      jobsActive: Number(kpisRow?.jobs_active ?? 0),
      jobsPending: Number(kpisRow?.jobs_pending ?? 0),
    },
    months,
    outstandingJobs: outstandingRows.map((row) => ({
      id: row.id,
      name: row.name,
      clientName: row.client_name ?? null,
      status: row.status,
      totalValue: Number(row.total_value ?? 0),
      amountBilled: Number(row.amount_billed ?? 0),
      amountPaid: Number(row.amount_paid ?? 0),
    })),
  })
}
