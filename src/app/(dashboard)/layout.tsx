import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { AdminBanner } from '@/components/layout/AdminBanner'
import { ACTIVE_ORG_COOKIE } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import type { UserPermissions } from '@/lib/permissions'
import sql from '@/lib/db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  if (session.user.platformRole === 'admin' && !activeOrgId) redirect('/admin')

  let adminOrgName: string | null = null
  let isOwner = session.user.role === 'owner'
  let perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...session.user.permissions }
  let orgName = 'My Company'
  let orgLogo: string | null = null
  let orgStatus: string = 'active'
  let trackWorkerTime = false

  const resolvedOrgId = activeOrgId ?? session.user.orgId

  if (resolvedOrgId) {
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
    await sql`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS paid_until     TIMESTAMPTZ
    `
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`
    await sql`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS track_worker_time BOOLEAN NOT NULL DEFAULT false
    `
    const [org] = await sql`SELECT name, logo_url, status, trial_ends_at, track_worker_time FROM organizations WHERE id = ${resolvedOrgId}`
    if (org) {
      orgName   = org.name
      orgLogo   = org.logo_url ?? null
      orgStatus = org.status ?? 'active'
      trackWorkerTime = !!org.track_worker_time

      // Auto-suspend if trial has expired
      if (orgStatus === 'trial' && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
        await sql`UPDATE organizations SET status = 'suspended' WHERE id = ${resolvedOrgId}`
        orgStatus = 'suspended'
      }
    }
  }

  // Platform admin in org context → bypass status gating, full perms
  if (session.user.platformRole === 'admin' && activeOrgId) {
    adminOrgName = orgName
    isOwner  = true
    orgStatus = 'active' // admins are never blocked
    perms = {
      can_view_jobs: true, can_edit_jobs: true, can_view_job_financials: true,
      can_view_schedule: true, can_manage_schedule: true, can_view_crew: true,
      can_view_financials: true, can_view_activity: true, can_upload_photos: true,
      can_view_tasks: true, can_complete_tasks: true, can_manage_tasks: true,
      can_view_change_orders: true, can_manage_change_orders: true, can_view_all_jobs: true,
    }
  }

  // Suspended orgs: show block page
  if (orgStatus === 'suspended' && session.user.platformRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">⛔</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your organization&apos;s access has been suspended. Please contact support to restore access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {adminOrgName && <AdminBanner orgName={adminOrgName} />}
      {/* Trial banner for regular users */}
      {orgStatus === 'trial' && session.user.platformRole !== 'admin' && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-semibold py-2 px-4">
          Trial account — contact us to activate your full account.
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar isOwner={isOwner} perms={perms} orgName={orgName} orgLogo={orgLogo} trackWorkerTime={trackWorkerTime} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar orgName={orgName} orgLogo={orgLogo} />
          <main className="flex-1 px-4 py-4 pb-20 sm:px-6 sm:py-6 sm:pb-6 max-w-4xl w-full mx-auto">
            {children}
          </main>
        </div>
        <BottomNav isOwner={isOwner} perms={perms} trackWorkerTime={trackWorkerTime} />
      </div>
    </div>
  )
}
