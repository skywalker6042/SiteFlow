import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user || (session.user as any).platformRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const [reply] = await sql`
    INSERT INTO ticket_replies (ticket_id, sender, message)
    VALUES (${id}, 'admin', ${message.trim()})
    RETURNING *
  `

  // Move ticket to in_progress if it was open
  await sql`
    UPDATE support_tickets
    SET status = 'in_progress', updated_at = NOW()
    WHERE id = ${id} AND status = 'open'
  `

  return NextResponse.json(reply)
}
