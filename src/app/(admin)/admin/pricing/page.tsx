import sql from '@/lib/db'
import { PricingEditor } from '@/components/admin/PricingEditor'
import { PlanTierEditor } from '@/components/admin/PlanTierEditor'
import { DEFAULT_PLAN_FEATURES, type PlanTier, type FeatureKey } from '@/lib/plan-features'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  price_trial_days: '14',
  price_core:       '39',
  price_pro:        '79',
  price_setup:      '699',
}

export default async function AdminPricingPage() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'price_%' OR key LIKE 'plan_features_%'`

  const pricing: Record<string, string> = { ...DEFAULTS }
  const planFeatures: Record<PlanTier, FeatureKey[]> = {
    trial: DEFAULT_PLAN_FEATURES.trial,
    core:  DEFAULT_PLAN_FEATURES.core,
    pro:   DEFAULT_PLAN_FEATURES.pro,
  }

  for (const row of rows as any[]) {
    if (row.key.startsWith('price_')) {
      pricing[row.key] = row.value
    } else if (row.key.startsWith('plan_features_')) {
      const tier = row.key.replace('plan_features_', '') as PlanTier
      if (tier in planFeatures) {
        try { planFeatures[tier] = JSON.parse(row.value) } catch {}
      }
    }
  }

  return (
    <div className="flex flex-col gap-10 max-w-4xl">
      {/* Pricing */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pricing Configuration</h1>
          <p className="text-sm text-gray-400 mt-0.5">Changes take effect immediately on the public pricing page.</p>
        </div>
        <div className="max-w-xl">
          <PricingEditor initial={pricing} />
        </div>
      </div>

      {/* Plan tiers */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Plan Feature Tiers</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configure which features are available on each plan. Assign plans to orgs from the org detail page.</p>
        </div>
        <PlanTierEditor initial={planFeatures} />
      </div>
    </div>
  )
}
