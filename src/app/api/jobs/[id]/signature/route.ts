import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

interface Ctx { params: Promise<{ id: string }> }

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_signatures (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id         UUID NOT NULL,
      invoice_type   TEXT NOT NULL DEFAULT 'contract',
      company_id     UUID NOT NULL,
      signature_data TEXT NOT NULL,
      signer_name    TEXT,
      signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, invoice_type)
    )
  `
  // Migrate old table: add invoice_type column + drop old unique, add new unique
  await sql`ALTER TABLE invoice_signatures ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'contract'`
  await sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoice_signatures_job_id_key'
      ) THEN
        ALTER TABLE invoice_signatures DROP CONSTRAINT invoice_signatures_job_id_key;
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoice_signatures_job_id_invoice_type_key'
      ) THEN
        ALTER TABLE invoice_signatures ADD CONSTRAINT invoice_signatures_job_id_invoice_type_key UNIQUE (job_id, invoice_type);
      END IF;
    END $$
  `
}

// Public — no auth needed (client signs from share link)
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  await ensureTable()

  const { signature_data, signer_name, token, invoice_type = 'contract' } = await req.json() as {
    signature_data: string
    signer_name?: string
    token: string
    invoice_type?: string
  }

  // Validate job via share token
  const [job] = await sql`SELECT id, company_id FROM jobs WHERE id = ${id} AND share_token = ${token}`
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [sig] = await sql`
    INSERT INTO invoice_signatures (job_id, invoice_type, company_id, signature_data, signer_name)
    VALUES (${job.id}, ${invoice_type}, ${job.company_id}, ${signature_data}, ${signer_name ?? null})
    ON CONFLICT (job_id, invoice_type) DO UPDATE SET
      signature_data = EXCLUDED.signature_data,
      signer_name    = EXCLUDED.signer_name,
      signed_at      = NOW()
    RETURNING *
  `

  // Signing the CO invoice approves all pending change orders for the job
  if (invoice_type === 'change_orders') {
    await sql`UPDATE change_orders SET approved = true WHERE job_id = ${job.id} AND approved = false`
  }

  return NextResponse.json(sig)
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  await ensureTable()
  const [sig] = await sql`SELECT * FROM invoice_signatures WHERE job_id = ${id} AND invoice_type = 'contract'`
  return NextResponse.json({ signature: sig ?? null })
}
