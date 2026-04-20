import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { unauthorized, forbidden } from '@/lib/auth-context'
import { auth } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/admin/orgs/[id]/status
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  const { id } = await params
  const body = await req.json() as {
    status?: 'trial' | 'active' | 'suspended'
    billing_status?: 'unpaid' | 'paid' | 'not_required'
    paid_until?: string | null
    trial_days?: number
    plan?: 'trial' | 'core' | 'pro'
  }

  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS billing_status  TEXT NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_until      TIMESTAMPTZ
  `
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'`

  // Compute trial_ends_at if trial_days provided
  const trialEndsAt = body.trial_days != null
    ? new Date(Date.now() + body.trial_days * 86400000).toISOString()
    : undefined

  const [org] = await sql`
    UPDATE organizations SET
      status         = COALESCE(${body.status         ?? null}, status),
      billing_status = COALESCE(${body.billing_status ?? null}, billing_status),
      plan           = COALESCE(${body.plan           ?? null}, plan),
      paid_until     = CASE
                         WHEN ${body.paid_until !== undefined} THEN ${body.paid_until ?? null}::timestamptz
                         ELSE paid_until
                       END,
      trial_ends_at  = CASE
                         WHEN ${trialEndsAt !== undefined} THEN ${trialEndsAt ?? null}::timestamptz
                         ELSE trial_ends_at
                       END
    WHERE id = ${id}
    RETURNING id, name, status, billing_status, paid_until, trial_ends_at, plan
  `
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(org)
}
