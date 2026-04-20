import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { hashSync } from 'bcryptjs'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.role !== 'owner' && session.user.platformRole !== 'admin') return forbidden()

  const orgId = session.user.orgId
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  await sql`
    ALTER TABLE org_members
    ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL
  `

  const members = await sql`
    SELECT
      om.id AS member_id,
      om.role,
      om.permissions,
      om.org_role_id,
      om.created_at,
      u.id   AS user_id,
      u.email,
      r.name AS org_role_name,
      r.color AS org_role_color
    FROM org_members om
    JOIN users u ON u.id = om.user_id
    LEFT JOIN org_roles r ON r.id = om.org_role_id
    WHERE om.org_id = ${orgId}
    ORDER BY om.role DESC, u.email ASC
  `
  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.role !== 'owner' && session.user.platformRole !== 'admin') return forbidden()

  const orgId = session.user.orgId
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { email, password, role = 'worker', org_role_id } = await req.json() as {
    email: string
    password: string
    role?: 'owner' | 'worker'
    org_role_id?: string | null
  }

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const [existingUser] = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`

  if (existingUser) {
    const [otherMembership] = await sql`
      SELECT org_id FROM org_members
      WHERE user_id = ${existingUser.id} AND org_id != ${orgId}
      LIMIT 1
    `
    if (otherMembership) {
      return NextResponse.json(
        { error: 'That email is already a member of another organization.' },
        { status: 409 }
      )
    }
  }

  const hash = hashSync(password, 12)

  const [user] = existingUser
    ? [existingUser]
    : await sql`
        INSERT INTO users (email, password_hash, platform_role)
        VALUES (${normalizedEmail}, ${hash}, 'org_user')
        RETURNING id, email
      `

  const defaultPerms = role === 'owner'
    ? JSON.stringify({ can_view_financials: true, can_edit_jobs: true, can_manage_schedule: true, can_upload_photos: true, can_view_all_jobs: true })
    : JSON.stringify({ can_view_financials: false, can_edit_jobs: false, can_manage_schedule: false, can_upload_photos: true, can_view_all_jobs: false })

  // If an org_role is specified, use its permissions instead
  let permsJson = defaultPerms
  if (org_role_id) {
    const [orgRole] = await sql`SELECT permissions FROM org_roles WHERE id = ${org_role_id} AND org_id = ${orgId}`
    if (orgRole) permsJson = JSON.stringify(orgRole.permissions)
  }

  const [member] = await sql`
    INSERT INTO org_members (org_id, user_id, role, permissions, org_role_id)
    VALUES (${orgId}, ${user.id}, ${role}, ${permsJson}::jsonb, ${org_role_id || null})
    ON CONFLICT (org_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, org_role_id = EXCLUDED.org_role_id
    RETURNING *
  `

  return NextResponse.json({ user: { id: user.id, email: normalizedEmail }, member }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.role !== 'owner' && session.user.platformRole !== 'admin') return forbidden()

  const orgId = session.user.orgId
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Prevent removing self
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await sql`DELETE FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}`
  return new NextResponse(null, { status: 204 })
}
