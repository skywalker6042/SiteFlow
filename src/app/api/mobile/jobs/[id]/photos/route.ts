import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'
import path from 'path'
import fs from 'fs/promises'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { id: jobId } = await params

  const rows = await sql`
    SELECT id, storage_path, caption, created_at
    FROM job_photos
    WHERE job_id = ${jobId}
    ORDER BY created_at DESC
  `

  return NextResponse.json({
    photos: rows.map(r => {
      const p = r as Record<string, unknown>
      return { id: p.id, storagePath: p.storage_path, caption: p.caption ?? null }
    })
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { id: jobId } = await params

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', jobId)
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  const storagePath = `/uploads/${jobId}/${filename}`
  const [photo] = await sql`
    INSERT INTO job_photos (company_id, job_id, storage_path)
    VALUES (${user.orgId}, ${jobId}, ${storagePath})
    RETURNING id, storage_path, caption
  `

  const p = photo as Record<string, unknown>
  return NextResponse.json(
    { id: p.id, storagePath: p.storage_path, caption: null },
    { status: 201 }
  )
}
