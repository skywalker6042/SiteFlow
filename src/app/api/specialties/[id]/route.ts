import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`DELETE FROM specialties WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return new NextResponse(null, { status: 204 })
}
