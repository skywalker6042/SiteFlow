import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'

interface Ctx { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params

  const [job] = await sql`SELECT id, company_id FROM jobs WHERE share_token = ${token}`
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await sql`ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'`

  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]
  if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
  await mkdir(uploadDir, { recursive: true })

  const saved = []
  for (const file of files) {
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const dest = path.join(uploadDir, name)
    await writeFile(dest, Buffer.from(await file.arrayBuffer()))
    const storagePath = `/uploads/photos/${name}`
    const [photo] = await sql`
      INSERT INTO job_photos (job_id, company_id, storage_path, source)
      VALUES (${job.id}, ${job.company_id}, ${storagePath}, 'client')
      RETURNING *
    `
    saved.push(photo)
  }

  return NextResponse.json(saved)
}
