import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { sendAdminAlert } from '@/lib/email'

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id     UUID,
      user_id    TEXT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      org_name   TEXT,
      type       TEXT NOT NULL DEFAULT 'general',
      subject    TEXT NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      priority   TEXT NOT NULL DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender     TEXT NOT NULL DEFAULT 'user',
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function POST(req: NextRequest) {
  await ensureTables()
  const session = await auth()
  const { name, email, org_name, type, subject, message } = await req.json()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const orgId  = (session?.user as any)?.orgId  ?? null
  const userId = (session?.user as any)?.id      ?? null

  const [ticket] = await sql`
    INSERT INTO support_tickets (org_id, user_id, name, email, org_name, type, subject, message)
    VALUES (${orgId}, ${userId}, ${name}, ${email}, ${org_name ?? null}, ${type ?? 'general'}, ${subject}, ${message})
    RETURNING id, subject, type, status, priority, created_at
  `
  sendAdminAlert(
    `New Support Ticket — ${subject}`,
    '🎫',
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:16px 0;">
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">From</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${name} &lt;${email}&gt;</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Org</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${org_name ?? 'N/A'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Type</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${type ?? 'general'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;">Message</td><td style="padding:8px 12px;font-size:13px;color:#111827;">${message.replace(/\n/g, '<br>')}</td></tr>
    </table>`
  )

  return NextResponse.json(ticket)
}

export async function GET(_req: NextRequest) {
  await ensureTables()
  const session = await auth()
  if (!session?.user) return NextResponse.json([])

  const userId = (session.user as any).id
  const tickets = await sql`
    SELECT id, subject, type, status, priority, created_at
    FROM support_tickets
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 10
  `
  return NextResponse.json(tickets)
}
