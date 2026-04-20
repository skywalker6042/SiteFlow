import { NextResponse } from 'next/server'
import { clearMobileSession } from '@/lib/mobile-auth'

export async function POST() {
  await clearMobileSession()
  return NextResponse.json({ ok: true })
}
