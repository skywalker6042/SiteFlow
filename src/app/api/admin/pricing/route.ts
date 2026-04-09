import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

const DEFAULTS: Record<string, string> = {
  price_trial_days: '14',
  price_core:       '39',
  price_pro:        '79',
  price_setup:      '299',
}

export async function ensurePricingTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function getPricing(): Promise<Record<string, string>> {
  await ensurePricingTable()
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'price_%'`
  const map: Record<string, string> = { ...DEFAULTS }
  for (const row of rows as any[]) map[row.key] = row.value
  return map
}

function isAdmin(session: any) {
  return session?.user?.platformRole === 'admin'
}

export async function GET() {
  const pricing = await getPricing()
  return NextResponse.json(pricing)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates = await req.json() as Record<string, string>
  await ensurePricingTable()

  for (const [key, value] of Object.entries(updates)) {
    if (!key.startsWith('price_')) continue
    await sql`
      INSERT INTO platform_settings (key, value)
      VALUES (${key}, ${String(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `
  }
  return NextResponse.json({ ok: true })
}
