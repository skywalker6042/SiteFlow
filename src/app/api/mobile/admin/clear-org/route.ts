import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ACTIVE_ORG_COOKIE } from '@/lib/auth-context'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST() {
  const user = await getMobileSessionUser()
  if (!user?.id) return unauthorized()
  if (user.platformRole !== 'admin') return forbidden()

  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_ORG_COOKIE)

  return NextResponse.json({ ok: true })
}
