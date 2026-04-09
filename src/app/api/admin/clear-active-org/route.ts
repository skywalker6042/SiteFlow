import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden, ACTIVE_ORG_COOKIE } from '@/lib/auth-context'

export async function POST() {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ACTIVE_ORG_COOKIE)
  return res
}
