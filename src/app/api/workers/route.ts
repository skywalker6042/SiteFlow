import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getOrgId, getSessionUser, forbidden } from '@/lib/auth-context'

export async function GET() {
  const orgId = await getOrgId()
  const workers = await sql`
    SELECT w.*,
      COALESCE(
        json_agg(json_build_object('id', s.id, 'name', s.name))
        FILTER (WHERE s.id IS NOT NULL), '[]'
      ) AS specialties
    FROM workers w
    LEFT JOIN worker_specialties ws ON ws.worker_id = w.id
    LEFT JOIN specialties s ON s.id = ws.specialty_id
    WHERE w.company_id = ${orgId}
    GROUP BY w.id ORDER BY w.name
  `
  return NextResponse.json(workers)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { name, phone, role, hourly_rate, specialty_ids = [] } = await req.json()
  const [worker] = await sql`
    INSERT INTO workers (company_id, name, phone, role, hourly_rate)
    VALUES (${user.effectiveOrgId}, ${name}, ${phone || null}, ${role || null}, ${hourly_rate ?? null})
    RETURNING *
  `
  if (specialty_ids.length > 0) {
    const rows = specialty_ids.map((sid: string) => ({ worker_id: worker.id, specialty_id: sid }))
    await sql`INSERT INTO worker_specialties ${sql(rows)} ON CONFLICT DO NOTHING`
  }
  return NextResponse.json(worker, { status: 201 })
}
