import { auth } from '@/lib/auth-edge'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ACTIVE_ORG_COOKIE } from '@/lib/auth-context'

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl
  const session = req.auth as { user?: { platformRole?: string } } | null

  // Always allow auth routes, share pages, public pages, and static assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/mobile') ||
    pathname.startsWith('/api/setup-requests') ||
    pathname.startsWith('/api/admin/pricing') ||
    pathname.startsWith('/api/share') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/setup-request') ||
    pathname.startsWith('/get-started') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // No session → redirect to login
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const platformRole = session.user.platformRole
  const isPlatformAdmin = platformRole === 'admin'
  const isPlatformStaff = platformRole === 'admin' || platformRole === 'support'
  const hasActiveOrg = !!req.cookies.get(ACTIVE_ORG_COOKIE)?.value

  // Admin in org context mode — allow through to dashboard
  if (isPlatformAdmin && hasActiveOrg) {
    // Block access to /admin while in org context (force them to exit first)
    if (pathname === '/admin' || pathname.startsWith('/admin/orgs')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Platform staff (admin/support) without org context — restrict to /admin routes only
  if (isPlatformStaff && !hasActiveOrg && !pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Regular user trying to hit /admin → send to /dashboard
  if (!isPlatformStaff && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)'],
}
