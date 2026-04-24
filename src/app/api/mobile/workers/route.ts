import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()

  const isOwner = user.role === 'owner' || user.platformRole === 'admin' || user.permissions.can_edit_jobs
  if (!isOwner) return forbidden()

  const { name, phone, role } = await req.json() as { name?: string; phone?: string; role?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [worker] = await sql`
    INSERT INTO workers (company_id, name, phone, role)
    VALUES (${user.orgId}, ${name.trim()}, ${phone?.trim() || null}, ${role?.trim() || null})
    RETURNING id, name, phone, role, created_at
  `

  return NextResponse.json({
    id: worker.id,
    name: worker.name,
    phone: worker.phone ?? null,
    role: worker.role ?? null,
  }, { status: 201 })
}
