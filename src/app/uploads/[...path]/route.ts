import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const filePath = path.join(process.cwd(), 'public', 'uploads', ...segments)

  try {
    const file = await readFile(filePath)
    const ext = segments[segments.length - 1].split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg'

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
