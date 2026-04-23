import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import sql from '@/lib/db'
import { createMobileSession } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email?: string; password?: string }

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const rows = await sql`
    SELECT u.id, u.email, u.password_hash, u.platform_role
    FROM users u
    WHERE u.email = ${email.toLowerCase().trim()}
    LIMIT 1
  ` as Array<{ id: string; email: string; password_hash: string; platform_role: string }>

  const user = rows[0]
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const valid = await compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  if (user.platform_role === 'support') {
    return NextResponse.json({ error: 'Support accounts must use the web portal at siteflo.app.' }, { status: 403 })
  }

  await createMobileSession(user.id)
  return NextResponse.json({ ok: true })
}
