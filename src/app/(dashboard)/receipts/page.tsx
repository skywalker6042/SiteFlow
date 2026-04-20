import { getSessionUser } from '@/lib/auth-context'
import { notFound } from 'next/navigation'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import sql from '@/lib/db'
import { ReceiptsClient } from '@/components/receipts/ReceiptsClient'

export const dynamic = 'force-dynamic'

export default async function ReceiptsPage() {
  const user  = await getSessionUser()
  const perms = { ...DEFAULT_WORKER_PERMISSIONS, ...user.permissions }
  const isOwner = user.role === 'owner' || user.platformRole === 'admin'
  if (!isOwner) notFound()

  const orgId = user.effectiveOrgId!

  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id  UUID NOT NULL,
      job_id      UUID,
      image_path  TEXT,
      vendor      TEXT,
      date        DATE,
      subtotal    NUMERIC(10,2),
      tax         NUMERIC(10,2),
      total       NUMERIC(10,2),
      category    TEXT NOT NULL DEFAULT 'Other',
      description TEXT,
      notes       TEXT,
      created_by  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const receipts = await sql`
    SELECT r.*, j.name AS job_name
    FROM receipts r
    LEFT JOIN jobs j ON j.id = r.job_id
    WHERE r.company_id = ${orgId}
    ORDER BY r.date DESC NULLS LAST, r.created_at DESC
  `

  const jobs = await sql`
    SELECT id, name FROM jobs
    WHERE company_id = ${orgId} AND status != 'done'
    ORDER BY name ASC
  `

  return <ReceiptsClient receipts={receipts as any} jobs={jobs as any} />
}
