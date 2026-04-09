import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { auth } from '@/lib/auth'
import { hashSync } from 'bcryptjs'

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/admin/users/[id] — update email and/or password
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const { email, password } = await req.json() as { email?: string; password?: string }

  if (!email?.trim() && !password) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const normalizedEmail = email?.toLowerCase().trim()

  // Check email conflict with a different user
  if (normalizedEmail) {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${normalizedEmail} AND id != ${id}`
    if (existing) return NextResponse.json({ error: 'Email already in use by another account' }, { status: 409 })
  }

  const hash = password ? hashSync(password, 12) : null

  const [user] = await sql`
    UPDATE users SET
      email         = COALESCE(${normalizedEmail ?? null}, email),
      password_hash = COALESCE(${hash}, password_hash)
    WHERE id = ${id}
    RETURNING id, email
  `
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}
