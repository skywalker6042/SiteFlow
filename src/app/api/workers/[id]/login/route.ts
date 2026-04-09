import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden, unauthorized } from '@/lib/auth-context'
import { hashSync } from 'bcryptjs'

interface Ctx { params: Promise<{ id: string }> }

// POST — create a login account for a worker
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id: workerId } = await params
  const { email, password } = await req.json() as { email: string; password: string }

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const orgId = user.effectiveOrgId!

  // Verify worker belongs to this org
  const [worker] = await sql`SELECT id, name FROM workers WHERE id = ${workerId} AND company_id = ${orgId}`
  if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })

  // Check no login already exists for this worker in this org
  const [existing] = await sql`
    SELECT om.id FROM org_members om
    WHERE om.worker_id = ${workerId} AND om.org_id = ${orgId} AND om.user_id IS NOT NULL
  `
  if (existing) return NextResponse.json({ error: 'Worker already has a login' }, { status: 409 })

  const normalizedEmail = email.toLowerCase().trim()
  const hash = hashSync(password, 12)

  // Check if this email already belongs to an existing user
  const [existingUser] = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
  if (existingUser) {
    // Check if they're linked to THIS worker in THIS org (password reset scenario)
    const [linked] = await sql`
      SELECT om.id FROM org_members om
      WHERE om.user_id = ${existingUser.id}
        AND om.org_id = ${orgId}
        AND om.worker_id = ${workerId}
    `
    if (linked) {
      // Re-setting password for the same worker — allow it
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${existingUser.id}`
      return NextResponse.json({ email: normalizedEmail }, { status: 200 })
    }
    // Email belongs to a user in another org — block it
    return NextResponse.json(
      { error: 'That email is already associated with another account. Each login can only belong to one organization.' },
      { status: 409 }
    )
  }

  const [newUser] = await sql`
    INSERT INTO users (email, password_hash, platform_role)
    VALUES (${normalizedEmail}, ${hash}, 'org_user')
    RETURNING id, email
  `

  await sql`
    INSERT INTO org_members (org_id, user_id, role, worker_id, permissions)
    VALUES (
      ${orgId}, ${newUser.id}, 'worker', ${workerId},
      '{"can_view_jobs":true,"can_edit_jobs":false,"can_view_job_financials":false,"can_view_schedule":true,"can_manage_schedule":false,"can_view_crew":false,"can_view_financials":false,"can_view_activity":false,"can_upload_photos":true,"can_view_tasks":true,"can_complete_tasks":true,"can_manage_tasks":false,"can_view_change_orders":false,"can_manage_change_orders":false,"can_view_all_jobs":false}'::jsonb
    )
    ON CONFLICT (org_id, user_id) DO UPDATE
      SET worker_id = EXCLUDED.worker_id
  `

  return NextResponse.json({ email: newUser.email }, { status: 201 })
}

// DELETE — remove login for a worker (keeps the worker record)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id: workerId } = await params
  const orgId = user.effectiveOrgId!

  await sql`
    DELETE FROM org_members
    WHERE worker_id = ${workerId} AND org_id = ${orgId}
  `
  return new NextResponse(null, { status: 204 })
}
