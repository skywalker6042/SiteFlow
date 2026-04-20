import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { DEFAULT_SUPPORT_CAPS, type SupportCap } from '@/lib/support-permissions'

const KEY = 'support_capabilities'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  const [row] = await sql`SELECT value FROM platform_settings WHERE key = ${KEY}`
  const caps: SupportCap[] = row ? JSON.parse(row.value) : DEFAULT_SUPPORT_CAPS
  return NextResponse.json(caps)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const caps = await req.json() as SupportCap[]

  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES (${KEY}, ${JSON.stringify(caps)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `
  return NextResponse.json(caps)
}
