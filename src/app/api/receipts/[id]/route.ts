import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const { job_id, vendor, date, subtotal, tax, total, category, description, notes } = await req.json()

  const [receipt] = await sql`
    UPDATE receipts SET
      job_id      = ${job_id      || null},
      vendor      = ${vendor      || null},
      date        = ${date        || null},
      subtotal    = ${subtotal    ?? null},
      tax         = ${tax         ?? null},
      total       = ${total       ?? null},
      category    = ${category    || 'Other'},
      description = ${description || null},
      notes       = ${notes       || null},
      updated_at  = NOW()
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
    RETURNING *
  `
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(receipt)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`DELETE FROM receipts WHERE id = ${id} AND company_id = ${user.effectiveOrgId}`
  return new NextResponse(null, { status: 204 })
}
