import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { ACTIVE_ORG_COOKIE } from '@/lib/auth-context'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id) return unauthorized()
  if (user.platformRole !== 'admin') return forbidden()

  const { orgId } = await req.json() as { orgId?: string }
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const [org] = await sql`SELECT id, name FROM organizations WHERE id = ${orgId}`
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return NextResponse.json({ ok: true, org: { id: org.id, name: org.name } })
}
