import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'

export async function GET() {
  const orgId = await getOrgId()
  const rows = await sql`
    SELECT t.id, t.company_id, t.name, t.color, t.created_at,
      COALESCE(
        json_agg(jsonb_build_object('id', w.id, 'name', w.name, 'phone', w.phone, 'role', w.role, 'created_at', w.created_at) ORDER BY w.name)
        FILTER (WHERE w.id IS NOT NULL), '[]'
      ) AS members
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN workers w ON w.id = tm.worker_id
    WHERE t.company_id = ${orgId}
    GROUP BY t.id ORDER BY t.name
  `
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [team] = await sql`
    INSERT INTO teams (company_id, name, color)
    VALUES (${user.effectiveOrgId}, ${name}, ${color ?? '#f97316'})
    RETURNING *
  `
  return NextResponse.json({ ...team, members: [] })
}
