import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { BRAND_DEFAULTS } from '@/lib/site-content'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET() {
  await ensureTable()
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'brand_%'` as any[]
  const settings = { ...BRAND_DEFAULTS }
  for (const row of rows) {
    const k = row.key.replace('brand_', '') as keyof typeof settings
    if (k in settings) (settings as any)[k] = row.value
  }
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await ensureTable()
  const body = await req.json() as { site_name?: string; primary_color?: string }

  const allowed = ['site_name', 'primary_color'] as const
  for (const key of allowed) {
    if (body[key] === undefined) continue
    const dbKey = `brand_${key}`
    const val   = String(body[key])
    await sql`
      INSERT INTO platform_settings (key, value)
      VALUES (${dbKey}, ${val})
      ON CONFLICT (key) DO UPDATE SET value = ${val}, updated_at = NOW()
    `
  }

  return NextResponse.json({ ok: true })
}
