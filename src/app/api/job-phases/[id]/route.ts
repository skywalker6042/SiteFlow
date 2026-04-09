import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { syncJobProgress } from '@/lib/progress'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const body = await req.json()

  const [current] = await sql`
    SELECT * FROM job_phases WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
  `
  if (!current) return new NextResponse(null, { status: 404 })

  if (body.direction === 'up' || body.direction === 'down') {
    const phases = await sql`
      SELECT id, order_index FROM job_phases
      WHERE job_id = ${current.job_id} AND company_id = ${user.effectiveOrgId}
      ORDER BY order_index ASC
    `
    const idx = phases.findIndex((p) => p.id === id)
    const swapIdx = body.direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= phases.length) {
      return NextResponse.json({ error: 'Already at boundary' }, { status: 400 })
    }
    const a = phases[idx], b = phases[swapIdx]
    await sql`UPDATE job_phases SET order_index = ${b.order_index} WHERE id = ${a.id}`
    await sql`UPDATE job_phases SET order_index = ${a.order_index} WHERE id = ${b.id}`
    const [updated] = await sql`SELECT * FROM job_phases WHERE id = ${id}`
    return NextResponse.json(updated)
  }

  const [phase] = await sql`
    UPDATE job_phases SET
      status        = COALESCE(${body.status        ?? null}, status),
      name          = COALESCE(${body.name          ?? null}, name),
      notes         = CASE WHEN ${body.notes        !== undefined} THEN ${body.notes        || null} ELSE notes        END,
      weight        = CASE WHEN ${body.weight       !== undefined} THEN ${body.weight       ?? null} ELSE weight       END,
      group_name    = CASE WHEN ${body.group_name   !== undefined} THEN ${body.group_name   || null} ELSE group_name   END,
      estimated_hrs = CASE WHEN ${body.estimated_hrs !== undefined} THEN ${body.estimated_hrs ?? null} ELSE estimated_hrs END
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  await syncJobProgress(current.job_id, user.effectiveOrgId!)
  return NextResponse.json(phase)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin' && !user.permissions.can_edit_jobs) return forbidden()

  const { id } = await params
  const [phase] = await sql`
    DELETE FROM job_phases WHERE id = ${id} AND company_id = ${user.effectiveOrgId} RETURNING job_id
  `
  if (!phase) return new NextResponse(null, { status: 404 })
  await syncJobProgress(phase.job_id, user.effectiveOrgId!)
  return new NextResponse(null, { status: 204 })
}
