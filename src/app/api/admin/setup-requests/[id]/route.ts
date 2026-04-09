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
  const { status } = await req.json()

  const [row] = await sql`
    UPDATE setup_requests
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(row)
}
