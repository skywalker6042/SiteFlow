import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden, ACTIVE_ORG_COOKIE } from '@/lib/auth-context'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { org_id } = await req.json() as { org_id: string }
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  // Validate org exists
  const [org] = await sql`SELECT id, name FROM organizations WHERE id = ${org_id}`
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const res = NextResponse.json({ ok: true, org: { id: org.id, name: org.name } })
  res.cookies.set(ACTIVE_ORG_COOKIE, org_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return res
}
