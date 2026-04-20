import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { ALL_FEATURES, DEFAULT_PLAN_FEATURES, type PlanTier, type FeatureKey } from '@/lib/plan-features'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

// GET /api/admin/plan-features  →  { trial: [...], core: [...], pro: [...] }
export async function GET() {
  await ensureTable()
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'plan_features_%'`

  const result: Record<PlanTier, FeatureKey[]> = {
    trial: DEFAULT_PLAN_FEATURES.trial,
    core:  DEFAULT_PLAN_FEATURES.core,
    pro:   DEFAULT_PLAN_FEATURES.pro,
  }

  for (const row of rows as any[]) {
    const tier = row.key.replace('plan_features_', '') as PlanTier
    if (tier in result) {
      try { result[tier] = JSON.parse(row.value) } catch {}
    }
  }

  return NextResponse.json(result)
}

// PATCH /api/admin/plan-features  →  body: { tier: 'core', features: [...] }
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await ensureTable()

  const { tier, features } = await req.json() as { tier: PlanTier; features: FeatureKey[] }
  if (!['trial', 'core', 'pro'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const validFeatures = features.filter(f => ALL_FEATURES.includes(f))
  const key = `plan_features_${tier}`
  const value = JSON.stringify(validFeatures)

  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `

  return NextResponse.json({ tier, features: validFeatures })
}
