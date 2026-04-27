import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { ensureFinancialSettingsColumns } from '@/lib/financial-settings'

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const orgId = user.effectiveOrgId!
  const body  = await req.json() as {
    co_separate_invoice?: boolean
    require_signature?:   boolean
    track_worker_time?:   boolean
    track_worker_job?:    boolean
    financial_include_labor?: boolean
    financial_include_receipts?: boolean
    financial_include_change_orders?: boolean
    financial_show_labor_breakdown?: boolean
    financial_show_receipt_breakdown?: boolean
  }

  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS co_separate_invoice BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS require_signature   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS track_worker_time   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS track_worker_job    BOOLEAN NOT NULL DEFAULT false
  `
  await ensureFinancialSettingsColumns()

  const [org] = await sql`
    UPDATE organizations SET
      co_separate_invoice = CASE WHEN ${body.co_separate_invoice !== undefined} THEN ${body.co_separate_invoice ?? false} ELSE co_separate_invoice END,
      require_signature   = CASE WHEN ${body.require_signature   !== undefined} THEN ${body.require_signature   ?? false} ELSE require_signature   END,
      track_worker_time   = CASE WHEN ${body.track_worker_time   !== undefined} THEN ${body.track_worker_time   ?? false} ELSE track_worker_time   END,
      track_worker_job    = CASE WHEN ${body.track_worker_job    !== undefined} THEN ${body.track_worker_job    ?? false} ELSE track_worker_job    END,
      financial_include_labor = CASE WHEN ${body.financial_include_labor !== undefined} THEN ${body.financial_include_labor ?? true} ELSE financial_include_labor END,
      financial_include_receipts = CASE WHEN ${body.financial_include_receipts !== undefined} THEN ${body.financial_include_receipts ?? true} ELSE financial_include_receipts END,
      financial_include_change_orders = CASE WHEN ${body.financial_include_change_orders !== undefined} THEN ${body.financial_include_change_orders ?? true} ELSE financial_include_change_orders END,
      financial_show_labor_breakdown = CASE WHEN ${body.financial_show_labor_breakdown !== undefined} THEN ${body.financial_show_labor_breakdown ?? true} ELSE financial_show_labor_breakdown END,
      financial_show_receipt_breakdown = CASE WHEN ${body.financial_show_receipt_breakdown !== undefined} THEN ${body.financial_show_receipt_breakdown ?? true} ELSE financial_show_receipt_breakdown END
    WHERE id = ${orgId}
    RETURNING
      co_separate_invoice,
      require_signature,
      track_worker_time,
      track_worker_job,
      financial_include_labor,
      financial_include_receipts,
      financial_include_change_orders,
      financial_show_labor_breakdown,
      financial_show_receipt_breakdown
  `
  return NextResponse.json(org)
}
