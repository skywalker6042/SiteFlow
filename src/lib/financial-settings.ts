import sql from '@/lib/db'

export interface FinancialSettings {
  financial_include_labor: boolean
  financial_include_receipts: boolean
  financial_include_change_orders: boolean
  financial_show_labor_breakdown: boolean
  financial_show_receipt_breakdown: boolean
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  financial_include_labor: true,
  financial_include_receipts: true,
  financial_include_change_orders: true,
  financial_show_labor_breakdown: true,
  financial_show_receipt_breakdown: true,
}

export async function ensureFinancialSettingsColumns() {
  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS financial_include_labor BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS financial_include_receipts BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS financial_include_change_orders BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS financial_show_labor_breakdown BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS financial_show_receipt_breakdown BOOLEAN NOT NULL DEFAULT true
  `
}

export function readFinancialSettings(row: Partial<FinancialSettings> | null | undefined): FinancialSettings {
  return {
    financial_include_labor: row?.financial_include_labor ?? DEFAULT_FINANCIAL_SETTINGS.financial_include_labor,
    financial_include_receipts: row?.financial_include_receipts ?? DEFAULT_FINANCIAL_SETTINGS.financial_include_receipts,
    financial_include_change_orders: row?.financial_include_change_orders ?? DEFAULT_FINANCIAL_SETTINGS.financial_include_change_orders,
    financial_show_labor_breakdown: row?.financial_show_labor_breakdown ?? DEFAULT_FINANCIAL_SETTINGS.financial_show_labor_breakdown,
    financial_show_receipt_breakdown: row?.financial_show_receipt_breakdown ?? DEFAULT_FINANCIAL_SETTINGS.financial_show_receipt_breakdown,
  }
}
