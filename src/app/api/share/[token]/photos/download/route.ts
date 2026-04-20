import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'
import JSZip from 'jszip'

interface Ctx { params: Promise<{ token: string }> }

// GET /api/share/[token]/photos/download
// Public endpoint — no login required. Used in the photo-deletion warning email.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params

  const [job] = await sql`
    SELECT id, name FROM jobs WHERE share_token = ${token} LIMIT 1
  `
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', job.id)

  // Check if the directory exists
  try {
    await stat(uploadDir)
  } catch {
    return NextResponse.json({ error: 'No photos found for this job' }, { status: 404 })
  }

  const files = await readdir(uploadDir)
  const imageFiles = files.filter(f => /\.(jpe?g|png|gif|webp|heic)$/i.test(f))

  if (imageFiles.length === 0) {
    return NextResponse.json({ error: 'No photos found for this job' }, { status: 404 })
  }

  const zip = new JSZip()
  const folder = zip.folder(job.name.replace(/[^a-z0-9\s-]/gi, '').trim() || 'job-photos')!

  for (const file of imageFiles) {
    const content = await readFile(path.join(uploadDir, file))
    folder.file(file, content)
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const safeName = job.name.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-') || 'job-photos'

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}-photos.zip"`,
      'Content-Length':      String(buffer.byteLength),
    },
  })
}
