import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden, unauthorized } from '@/lib/auth-context'
import { randomBytes } from 'crypto'

interface Ctx { params: Promise<{ id: string }> }

// POST — generate or return existing share token
export async function POST(_req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const [job] = await sql`
    SELECT id, share_token FROM jobs
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
  `
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return existing token if already set
  if (job.share_token) return NextResponse.json({ token: job.share_token })

  const token = randomBytes(20).toString('hex')
  await sql`UPDATE jobs SET share_token = ${token} WHERE id = ${id}`
  return NextResponse.json({ token })
}

// DELETE — revoke share token
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  await sql`
    UPDATE jobs SET share_token = NULL
    WHERE id = ${id} AND company_id = ${user.effectiveOrgId}
  `
  return new NextResponse(null, { status: 204 })
}
