import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'

export async function GET() {
  const orgId = await getOrgId()
  const specialties = await sql`SELECT * FROM specialties WHERE company_id = ${orgId} ORDER BY name ASC`
  return NextResponse.json(specialties)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [specialty] = await sql`
    INSERT INTO specialties (company_id, name) VALUES (${user.effectiveOrgId}, ${name.trim()})
    ON CONFLICT (company_id, name) DO NOTHING
    RETURNING *
  `
  if (!specialty) return NextResponse.json({ error: 'Specialty already exists' }, { status: 409 })
  return NextResponse.json(specialty, { status: 201 })
}
