import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser()
  const { id } = await params

  const isSelf  = user.workerId === id
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'

  // Must be either the owner or the worker themselves
  if (!isOwner && !isSelf) return forbidden()

  const body = await req.json()

  // Workers can only update their own contact info — not name or role
  if (isSelf && !isOwner) {
    delete body.name
    delete body.role
  }

  const { name, phone, role, hourly_rate, specialty_ids } = body

  const [worker] = await sql`
    UPDATE workers SET
      name        = COALESCE(${name ?? null}, name),
      phone       = ${phone !== undefined ? (phone || null) : sql`phone`},
      role        = ${role !== undefined && isOwner ? (role || null) : sql`role`},
      hourly_rate = ${hourly_rate !== undefined && isOwner ? (hourly_rate ?? null) : sql`hourly_rate`}
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!worker) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (Array.isArray(specialty_ids)) {
    await sql`DELETE FROM worker_specialties WHERE worker_id = ${id}`
    if (specialty_ids.length > 0) {
      const rows = specialty_ids.map((sid: string) => ({ worker_id: id, specialty_id: sid }))
      await sql`INSERT INTO worker_specialties ${sql(rows, 'worker_id', 'specialty_id')} ON CONFLICT DO NOTHING`
    }
  }

  const [full] = await sql`
    SELECT w.*,
      COALESCE(json_agg(jsonb_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS specialties
    FROM workers w
    LEFT JOIN worker_specialties ws ON ws.worker_id = w.id
    LEFT JOIN specialties s ON s.id = ws.specialty_id
    WHERE w.id = ${id} GROUP BY w.id
  `
  return NextResponse.json(full)
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`DELETE FROM workers WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return NextResponse.json({ ok: true })
}
