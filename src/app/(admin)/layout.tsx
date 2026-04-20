import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminCaps } from '@/lib/admin-caps'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || (session.user.platformRole !== 'admin' && session.user.platformRole !== 'support')) redirect('/login')

  const { can, isAdmin } = await getAdminCaps()

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-900">SiteFlo</span>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold tracking-wide">
              {isAdmin ? 'ADMIN' : 'SUPPORT'}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {can('view_orgs')             && <Link href="/admin"                className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Orgs</Link>}
            {can('manage_tickets')        && <Link href="/admin/tickets"        className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Tickets</Link>}
            {can('manage_setup_requests') && <Link href="/admin/setup-requests" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Setup Reqs</Link>}
            {can('manage_pricing')        && <Link href="/admin/pricing"        className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Pricing</Link>}
            {can('view_health')           && <Link href="/admin/health"         className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Health</Link>}
            {isAdmin && <Link href="/admin/site"  className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Site</Link>}
            {isAdmin && <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium">Users</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{session.user.email}</span>
          <form action={handleSignOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
