import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

interface Ctx { params: Promise<{ id: string }> }

function isAdmin(session: any) {
  return session?.user?.platformRole === 'admin'
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, priority } = await req.json()

  const updates: Record<string, string> = {}
  if (status)   updates.status   = status
  if (priority) updates.priority = priority

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const [ticket] = await sql`
    UPDATE support_tickets
    SET
      status     = COALESCE(${status   ?? null}, status),
      priority   = COALESCE(${priority ?? null}, priority),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(ticket)
}
