import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { EDITABLE_PAGES, type PageKey } from '@/lib/site-content'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

// GET /api/admin/content?page=pricing  →  { hero_badge: '...', ... }
export async function GET(req: NextRequest) {
  await ensureTable()
  const page = req.nextUrl.searchParams.get('page') as PageKey | null
  if (!page || !(page in EDITABLE_PAGES)) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
  }

  const prefix = `content_${page}_`
  const pattern = prefix + '%'
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE ${pattern}` as any[]
  const blocks: Record<string, string> = {}
  for (const row of rows) blocks[row.key.slice(prefix.length)] = row.value
  return NextResponse.json(blocks)
}

// PATCH /api/admin/content  →  body: { page: 'pricing', key: 'hero_title', value: '...' }
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await ensureTable()
  const { page, key, value } = await req.json() as { page: PageKey; key: string; value: string }

  if (!page || !(page in EDITABLE_PAGES)) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
  }

  const pageConfig = EDITABLE_PAGES[page]
  const validKeys = pageConfig.sections.map(s => s.key)
  if (!validKeys.includes(key as any)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const dbKey = `content_${page}_${key}`
  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES (${dbKey}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `

  return NextResponse.json({ ok: true })
}
