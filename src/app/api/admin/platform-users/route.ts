import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { hashSync } from 'bcryptjs'

async function ensureSupportRole() {
  // Drop any CHECK constraint on platform_role that would block 'support'
  await sql`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'users' AND att.attname = 'platform_role' AND con.contype = 'c'
      LOOP
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(r.conname);
      END LOOP;
    END $$
  `
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const users = await sql`
    SELECT u.id, u.email, u.platform_role, u.created_at,
      o.name AS org_name
    FROM users u
    LEFT JOIN org_members om ON om.user_id = u.id
    LEFT JOIN organizations o ON o.id = om.org_id
    WHERE u.platform_role IN ('admin', 'support')
    ORDER BY u.platform_role ASC, u.email ASC
  `
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { email, password, platform_role } = await req.json() as {
    email: string
    password: string
    platform_role: 'admin' | 'support'
  }

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }
  if (platform_role !== 'admin' && platform_role !== 'support') {
    return NextResponse.json({ error: 'platform_role must be admin or support' }, { status: 400 })
  }

  await ensureSupportRole()

  const normalizedEmail = email.toLowerCase().trim()
  const [existing] = await sql`SELECT id, platform_role FROM users WHERE email = ${normalizedEmail}`

  if (existing) {
    const [updated] = await sql`
      UPDATE users SET platform_role = ${platform_role}
      WHERE id = ${existing.id}
      RETURNING id, email, platform_role, created_at
    `
    return NextResponse.json(updated)
  }

  const hash = hashSync(password, 12)
  const [user] = await sql`
    INSERT INTO users (email, password_hash, platform_role)
    VALUES (${normalizedEmail}, ${hash}, ${platform_role})
    RETURNING id, email, platform_role, created_at
  `
  return NextResponse.json(user, { status: 201 })
}
