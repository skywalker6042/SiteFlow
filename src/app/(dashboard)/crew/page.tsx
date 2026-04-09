import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'
import type { WorkerWithSpecialties, TeamWithMembers, Specialty, OrgRole } from '@/types'
import { CrewPage } from '@/components/crew/CrewPage'

export const dynamic = 'force-dynamic'

export default async function CrewPageRoute() {
  const orgId = await getOrgId()

  // Ensure org_roles schema is ready (idempotent)
  await sql`
    CREATE TABLE IF NOT EXISTS org_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL`

  const [workers, teams, specialties, roles] = await Promise.all([
    sql`
      SELECT w.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name))
          FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS specialties,
        u.email AS login_email,
        om.org_role_id,
        r.name  AS role_name,
        r.color AS role_color
      FROM workers w
      LEFT JOIN worker_specialties ws ON ws.worker_id = w.id
      LEFT JOIN specialties s ON s.id = ws.specialty_id
      LEFT JOIN org_members om ON om.worker_id = w.id AND om.org_id = ${orgId}
      LEFT JOIN org_roles r ON r.id = om.org_role_id
      LEFT JOIN users u ON u.id = om.user_id
      WHERE w.company_id = ${orgId}
      GROUP BY w.id, u.email, om.org_role_id, r.name, r.color
      ORDER BY w.name
    ` as unknown as Promise<(WorkerWithSpecialties & {
        login_email: string | null
        org_role_id: string | null
        role_name: string | null
        role_color: string | null
      })[]>,
    sql`
      SELECT
        t.id, t.company_id, t.name, t.color, t.created_at,
        COALESCE(
          json_agg(
            jsonb_build_object('id', w.id, 'name', w.name, 'phone', w.phone, 'role', w.role, 'created_at', w.created_at)
            ORDER BY w.name
          ) FILTER (WHERE w.id IS NOT NULL),
          '[]'
        ) AS members
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      LEFT JOIN workers w ON w.id = tm.worker_id
      WHERE t.company_id = ${orgId}
      GROUP BY t.id
      ORDER BY t.name
    ` as unknown as Promise<TeamWithMembers[]>,
    sql`SELECT * FROM specialties WHERE company_id = ${orgId} ORDER BY name` as unknown as Promise<Specialty[]>,
    sql`SELECT * FROM org_roles WHERE org_id = ${orgId} ORDER BY name` as unknown as Promise<OrgRole[]>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Workers</h1>
      <CrewPage
        initialWorkers={workers as any}
        initialTeams={teams}
        specialties={specialties}
        roles={roles}
      />
    </div>
  )
}
