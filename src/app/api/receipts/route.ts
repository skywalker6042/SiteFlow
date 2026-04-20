import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSessionUser, forbidden } from '@/lib/auth-context'

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
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  await ensureTable()

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')

  const rows = jobId
    ? await sql`
        SELECT r.*, j.name AS job_name
        FROM receipts r
        LEFT JOIN jobs j ON j.id = r.job_id
        WHERE r.company_id = ${user.effectiveOrgId} AND r.job_id = ${jobId}
        ORDER BY r.date DESC, r.created_at DESC
      `
    : await sql`
        SELECT r.*, j.name AS job_name
        FROM receipts r
        LEFT JOIN jobs j ON j.id = r.job_id
        WHERE r.company_id = ${user.effectiveOrgId}
        ORDER BY r.date DESC, r.created_at DESC
      `

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()
  await ensureTable()

  const { job_id, image_path, vendor, date, subtotal, tax, total, category, description, notes } = await req.json()

  const [receipt] = await sql`
    INSERT INTO receipts
      (company_id, job_id, image_path, vendor, date, subtotal, tax, total, category, description, notes, created_by)
    VALUES
      (${user.effectiveOrgId}, ${job_id || null}, ${image_path || null},
       ${vendor || null}, ${date || null}, ${subtotal ?? null}, ${tax ?? null},
       ${total ?? null}, ${category || 'Other'}, ${description || null},
       ${notes || null}, ${user.email})
    RETURNING *
  `
  return NextResponse.json(receipt, { status: 201 })
}
