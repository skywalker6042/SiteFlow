import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const { id } = await params
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  const isSelf = user.workerId === id
  if (!isOwner && !isSelf) return forbidden()

  const body = await req.json() as { name?: string; phone?: string; role?: string }
  const nextName = isOwner && body.name !== undefined ? body.name.trim() || null : undefined
  const nextPhone = body.phone !== undefined ? body.phone.trim() || null : undefined
  const nextRole = isOwner && body.role !== undefined ? body.role.trim() || null : undefined

  const [worker] = await sql`
    UPDATE workers SET
      name = ${nextName !== undefined ? nextName : sql`name`},
      phone = ${nextPhone !== undefined ? nextPhone : sql`phone`},
      role = ${nextRole !== undefined ? nextRole : sql`role`}
    WHERE id = ${id} AND company_id = ${user.orgId}
    RETURNING id, name, phone, role
  `

  if (!worker) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: worker.id,
    name: worker.name,
    phone: worker.phone ?? null,
    role: worker.role ?? null,
  })
}
