import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requirePlatformAdmin, forbidden, unauthorized } from '@/lib/auth-context'
import { auth } from '@/lib/auth'

// GET /api/admin/orgs — list all orgs with counts
export async function GET() {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const orgs = await sql`
    SELECT
      o.id, o.name, o.slug, o.created_at,
      COUNT(DISTINCT om.id) FILTER (WHERE om.id IS NOT NULL) AS member_count,
      COUNT(DISTINCT om.id) FILTER (WHERE om.role = 'owner') AS owner_count,
      COUNT(DISTINCT j.id)  FILTER (WHERE j.id  IS NOT NULL) AS job_count
    FROM organizations o
    LEFT JOIN org_members om ON om.org_id = o.id
    LEFT JOIN jobs j ON j.company_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `
  return NextResponse.json(orgs)
}

// POST /api/admin/orgs — create a new org
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { name, slug } = await req.json() as { name: string; slug?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const generatedSlug = (slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))

  const [org] = await sql`
    INSERT INTO organizations (name, slug)
    VALUES (${name.trim()}, ${generatedSlug})
    RETURNING *
  `
  return NextResponse.json(org, { status: 201 })
}
