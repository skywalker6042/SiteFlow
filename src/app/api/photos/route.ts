import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  if (!perms.can_upload_photos && user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const formData = await req.formData()
  const file  = formData.get('file')   as File   | null
  const jobId = formData.get('job_id') as string | null

  if (!file || !jobId) return NextResponse.json({ error: 'Missing file or job_id' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename   = `${Date.now()}.${ext}`
  const uploadDir  = path.join(process.cwd(), 'public', 'uploads', jobId)
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  const storagePath = `/uploads/${jobId}/${filename}`
  const [photo] = await sql`
    INSERT INTO job_photos (company_id, job_id, storage_path)
    VALUES (${user.effectiveOrgId}, ${jobId}, ${storagePath})
    RETURNING *
  `
  return NextResponse.json(photo, { status: 201 })
}
