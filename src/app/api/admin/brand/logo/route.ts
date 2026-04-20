import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await ensureTable()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'platform')
  await mkdir(uploadDir, { recursive: true })

  const filename = `brand-logo.${ext}`
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  const logoUrl = `/uploads/platform/${filename}`
  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES ('brand_logo_url', ${logoUrl})
    ON CONFLICT (key) DO UPDATE SET value = ${logoUrl}, updated_at = NOW()
  `

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  await ensureTable()
  const [row] = await sql`SELECT value FROM platform_settings WHERE key = 'brand_logo_url'` as any[]
  if (row?.value) {
    const filePath = path.join(process.cwd(), 'public', row.value)
    await unlink(filePath).catch(() => {})
  }
  await sql`DELETE FROM platform_settings WHERE key = 'brand_logo_url'`
  return new NextResponse(null, { status: 204 })
}
