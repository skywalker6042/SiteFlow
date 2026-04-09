import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const orgId = user.effectiveOrgId!
  const { name, phone } = await req.json() as { name?: string; phone?: string | null }

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT`

  const [org] = await sql`
    UPDATE organizations
    SET name = ${name.trim()}, phone = ${phone ?? null}
    WHERE id = ${orgId}
    RETURNING name, phone
  `
  return NextResponse.json(org)
}
