import sql from '@/lib/db'
import { PricingEditor } from '@/components/admin/PricingEditor'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  price_trial_days: '14',
  price_core:       '39',
  price_pro:        '79',
  price_setup:      '299',
}

export default async function AdminPricingPage() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'price_%'`
  const pricing: Record<string, string> = { ...DEFAULTS }
  for (const row of rows as any[]) pricing[row.key] = row.value

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pricing Configuration</h1>
        <p className="text-sm text-gray-400 mt-0.5">Changes take effect immediately on the public pricing page.</p>
      </div>
      <PricingEditor initial={pricing} />
    </div>
  )
}
