import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const [photo] = await sql`SELECT storage_path FROM job_photos WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  if (!photo) return new NextResponse(null, { status: 404 })

  await unlink(path.join(process.cwd(), 'public', photo.storage_path)).catch(() => {})
  await sql`DELETE FROM job_photos WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return new NextResponse(null, { status: 204 })
}
