import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const { name, color } = await req.json()
  const [team] = await sql`
    UPDATE teams SET
      name  = COALESCE(${name  ?? null}, name),
      color = COALESCE(${color ?? null}, color)
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!team) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`DELETE FROM teams WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return NextResponse.json({ ok: true })
}
