import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

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
