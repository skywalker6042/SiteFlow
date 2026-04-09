import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { auth } from '@/lib/auth'
import { hashSync } from 'bcryptjs'

interface Ctx { params: Promise<{ id: string }> }

// POST /api/admin/orgs/[id]/members — create an owner user for this org
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id: orgId } = await params
  const { email, password, role = 'owner' } = await req.json() as {
    email: string
    password: string
    role?: 'owner' | 'worker'
  }

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  // Verify org exists
  const [org] = await sql`SELECT id FROM organizations WHERE id = ${orgId}`
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const normalizedEmail = email.toLowerCase().trim()

  // Check if this email is already a user in another org
  const [existingUser] = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`

  if (existingUser) {
    const [otherMembership] = await sql`
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = ${existingUser.id}
        AND om.org_id != ${orgId}
      LIMIT 1
    `
    if (otherMembership) {
      return NextResponse.json(
        { error: 'That email is already a member of another organization. Each account can only belong to one organization.' },
        { status: 409 }
      )
    }
  }

  const hash = hashSync(password, 12)

  // Create user (or update password only if they have no org yet — first-time setup)
  const [user] = existingUser
    ? [existingUser]
    : await sql`
        INSERT INTO users (email, password_hash, platform_role)
        VALUES (${normalizedEmail}, ${hash}, 'org_user')
        RETURNING id, email
      `

  const ownerPerms = JSON.stringify({
    can_view_financials:  true,
    can_edit_jobs:        true,
    can_manage_schedule:  true,
    can_upload_photos:    true,
    can_view_all_jobs:    true,
  })

  const workerPerms = JSON.stringify({
    can_view_financials:  false,
    can_edit_jobs:        false,
    can_manage_schedule:  false,
    can_upload_photos:    true,
    can_view_all_jobs:    false,
  })

  const perms = role === 'owner' ? ownerPerms : workerPerms

  const [member] = await sql`
    INSERT INTO org_members (org_id, user_id, role, permissions)
    VALUES (${orgId}, ${user.id}, ${role}, ${perms}::jsonb)
    ON CONFLICT (org_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, permissions = EXCLUDED.permissions
    RETURNING *
  `

  return NextResponse.json({ user: { id: user.id, email: normalizedEmail }, member }, { status: 201 })
}

// DELETE /api/admin/orgs/[id]/members?userId=xxx — remove a member
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id: orgId } = await params
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  await sql`DELETE FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}`
  return new NextResponse(null, { status: 204 })
}
