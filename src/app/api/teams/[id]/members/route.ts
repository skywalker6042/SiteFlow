import sql from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const { worker_ids } = await req.json() as { worker_ids: string[] }

  const [team] = await sql`SELECT id FROM teams WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  if (!team) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await sql`DELETE FROM team_members WHERE team_id = ${id}`
  if (worker_ids.length > 0) {
    const rows = worker_ids.map((wid) => ({ team_id: id, worker_id: wid }))
    await sql`INSERT INTO team_members ${sql(rows, 'team_id', 'worker_id')}`
  }

  const members = await sql`
    SELECT w.id, w.name, w.phone, w.role, w.created_at
    FROM workers w JOIN team_members tm ON tm.worker_id = w.id
    WHERE tm.team_id = ${id} ORDER BY w.name
  `
  return NextResponse.json(members)
}
