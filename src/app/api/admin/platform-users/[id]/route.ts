import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  if (id === session.user.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  const { platform_role } = await req.json() as { platform_role: 'admin' | 'support' }
  if (platform_role !== 'admin' && platform_role !== 'support') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const [user] = await sql`
    UPDATE users SET platform_role = ${platform_role}
    WHERE id = ${id}
    RETURNING id, email, platform_role
  `
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  if (id === session.user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  // Revoke platform role (set to org_user) instead of deleting the account
  await sql`UPDATE users SET platform_role = 'org_user' WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
