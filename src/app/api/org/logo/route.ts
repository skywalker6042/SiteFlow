import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

// Ensure column exists
async function ensureColumn() {
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
}

export async function POST(req: NextRequest) {
  await ensureColumn()
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const orgId = user.effectiveOrgId!
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const filename   = `${orgId}.${ext}`
  const uploadDir  = path.join(process.cwd(), 'public', 'uploads', 'logos')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  const logoUrl = `/uploads/logos/${filename}`
  await sql`UPDATE organizations SET logo_url = ${logoUrl} WHERE id = ${orgId}`

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE(_req: NextRequest) {
  await ensureColumn()
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const orgId = user.effectiveOrgId!
  const [org] = await sql`SELECT logo_url FROM organizations WHERE id = ${orgId}`

  if (org?.logo_url) {
    const filePath = path.join(process.cwd(), 'public', org.logo_url)
    await unlink(filePath).catch(() => {})
  }

  await sql`UPDATE organizations SET logo_url = NULL WHERE id = ${orgId}`
  return new NextResponse(null, { status: 204 })
}
