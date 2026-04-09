import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { auth } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

// GET /api/admin/orgs/[id] — org detail with members
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const [org] = await sql`SELECT * FROM organizations WHERE id = ${id}`
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await sql`
    SELECT
      om.id, om.role, om.permissions, om.created_at,
      u.email, u.platform_role,
      w.name AS worker_name, w.phone AS worker_phone
    FROM org_members om
    JOIN users u ON u.id = om.user_id
    LEFT JOIN workers w ON w.id = om.worker_id
    WHERE om.org_id = ${id}
    ORDER BY om.role DESC, u.email ASC
  `
  return NextResponse.json({ org, members })
}

// PATCH /api/admin/orgs/[id] — update org name/slug
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const body = await req.json() as { name?: string; slug?: string }

  const [org] = await sql`
    UPDATE organizations
    SET
      name = COALESCE(${body.name ?? null}, name),
      slug = COALESCE(${body.slug ?? null}, slug)
    WHERE id = ${id}
    RETURNING *
  `
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(org)
}

// DELETE /api/admin/orgs/[id] — delete org and all its data
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const [org] = await sql`SELECT id FROM organizations WHERE id = ${id}`
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete in dependency order within a transaction.
  // workers → cascades job_workers, team_members, work_day_workers, worker_specialties
  // teams   → cascades remaining team_members
  // jobs    → cascades change_orders, job_phases, job_photos, job_tasks, work_days → work_day_workers
  // organizations → cascades org_members
  await sql.begin(async (tx) => {
    await tx`DELETE FROM workers      WHERE company_id = ${id}`
    await tx`DELETE FROM teams        WHERE company_id = ${id}`
    await tx`DELETE FROM specialties  WHERE company_id = ${id}`
    await tx`DELETE FROM jobs         WHERE company_id = ${id}`
    await tx`DELETE FROM organizations WHERE id = ${id}`
  })

  return new NextResponse(null, { status: 204 })
}
