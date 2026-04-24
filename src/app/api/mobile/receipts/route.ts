import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getMobileSessionUser } from '@/lib/mobile-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

async function ensureTable() {
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
}

export async function GET(req: NextRequest) {
  const user = await getMobileSessionUser()
  if (!user?.id || !user.orgId) return unauthorized()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  await ensureTable()
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')

  const receipts = jobId
    ? await sql`
        SELECT r.*, j.name AS job_name
        FROM receipts r
        LEFT JOIN jobs j ON j.id = r.job_id
        WHERE r.company_id = ${user.orgId} AND r.job_id = ${jobId}
        ORDER BY r.date DESC NULLS LAST, r.created_at DESC
      `
    : await sql`
        SELECT r.*, j.name AS job_name
        FROM receipts r
        LEFT JOIN jobs j ON j.id = r.job_id
        WHERE r.company_id = ${user.orgId}
        ORDER BY r.date DESC NULLS LAST, r.created_at DESC
      `

  return NextResponse.json(receipts.map((row) => ({
    id: row.id,
    jobId: row.job_id ?? null,
    jobName: row.job_name ?? null,
    vendor: row.vendor ?? null,
    date: row.date ?? null,
    total: row.total != null ? Number(row.total) : null,
    category: row.category ?? 'Other',
    description: row.description ?? null,
    notes: row.notes ?? null,
    imagePath: row.image_path ?? null,
  })))
}
