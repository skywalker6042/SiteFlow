import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const orgId  = user.effectiveOrgId
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit')  ?? '50'), 200)
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')
  const jobId  = req.nextUrl.searchParams.get('job_id')

  const rows = await sql`
    SELECT * FROM activity_logs
    WHERE company_id = ${orgId}
      ${jobId ? sql`AND entity_id = ${jobId} AND entity_type = 'job'
                    OR (metadata->>'job_id' = ${jobId} AND company_id = ${orgId})` : sql``}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return NextResponse.json(rows)
}
