import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS setup_requests (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id            UUID,
      organization_name TEXT NOT NULL,
      contact_name      TEXT NOT NULL,
      email             TEXT NOT NULL,
      phone             TEXT,
      workers_count     INT,
      project_details   TEXT,
      notes             TEXT,
      status            TEXT NOT NULL DEFAULT 'new',
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const session = await auth()

  const {
    organization_name, contact_name, email,
    phone, workers_count, project_details, notes,
  } = await req.json()

  if (!organization_name || !contact_name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const orgId = (session?.user as any)?.orgId ?? null

  const [request] = await sql`
    INSERT INTO setup_requests
      (org_id, organization_name, contact_name, email, phone, workers_count, project_details, notes)
    VALUES
      (${orgId}, ${organization_name}, ${contact_name}, ${email},
       ${phone ?? null}, ${workers_count ?? null}, ${project_details ?? null}, ${notes ?? null})
    RETURNING id, organization_name, contact_name, email, status, created_at
  `

  // Also auto-create a support ticket tagged as onboarding
  try {
    await sql`
      INSERT INTO support_tickets (org_id, user_id, name, email, org_name, type, subject, message)
      VALUES (${orgId}, ${(session?.user as any)?.id ?? null}, ${contact_name}, ${email},
              ${organization_name}, 'onboarding',
              ${'Pro Setup Request — ' + organization_name},
              ${`Workers: ${workers_count ?? 'N/A'}\n\nProjects:\n${project_details ?? 'N/A'}\n\nNotes:\n${notes ?? 'None'}`})
    `
  } catch {
    // support_tickets may not exist yet — not critical
  }

  return NextResponse.json(request)
}
