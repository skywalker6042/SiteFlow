import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { AdminBanner } from '@/components/layout/AdminBanner'
import { TicketForm } from '@/components/support/TicketForm'
import { ACTIVE_ORG_COOKIE } from '@/lib/auth-context'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'
import type { UserPermissions } from '@/lib/permissions'
import { DEFAULT_PLAN_FEATURES, ALL_FEATURES, type PlanTier, type FeatureKey } from '@/lib/plan-features'
import sql from '@/lib/db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  if (session.user.platformRole === 'admin' && !activeOrgId) redirect('/admin')

  let adminOrgName: string | null = null
  let adminOrgPlan: string = 'trial'
  let isOwner = session.user.role === 'owner'
  let perms: UserPermissions = { ...DEFAULT_WORKER_PERMISSIONS, ...session.user.permissions }
  let orgName = 'My Company'
  let orgLogo: string | null = null
  let orgStatus: string = 'active'
  let trackWorkerTime = false
  let enabledFeatures: FeatureKey[] = DEFAULT_PLAN_FEATURES.trial
  let currentOrgPlan: PlanTier = 'trial'

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
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS track_worker_time BOOLEAN NOT NULL DEFAULT false`
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'`

    const [org] = await sql`SELECT name, logo_url, status, trial_ends_at, track_worker_time, plan FROM organizations WHERE id = ${resolvedOrgId}`
    if (org) {
      orgName         = org.name
      orgLogo         = org.logo_url ?? null
      orgStatus       = org.status ?? 'active'
      trackWorkerTime = !!org.track_worker_time

      // Load plan features for this org's plan
      const orgPlan = (org.plan ?? 'trial') as PlanTier
      currentOrgPlan = orgPlan
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS platform_settings (
            key        TEXT PRIMARY KEY,
            value      TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `
        const [pfRow] = await sql`SELECT value FROM platform_settings WHERE key = ${'plan_features_' + orgPlan}` as any[]
        if (pfRow?.value) {
          enabledFeatures = JSON.parse(pfRow.value)
        } else {
          enabledFeatures = DEFAULT_PLAN_FEATURES[orgPlan]
        }
      } catch {
        enabledFeatures = DEFAULT_PLAN_FEATURES[orgPlan]
      }

      // Auto-suspend if trial has expired
      if (orgStatus === 'trial' && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
        await sql`UPDATE organizations SET status = 'suspended' WHERE id = ${resolvedOrgId}`
        orgStatus = 'suspended'
      }
    }
  }

  // Platform admin in org context → bypass status gating, full perms, all features
  if (session.user.platformRole === 'admin' && activeOrgId) {
    adminOrgName    = orgName
    adminOrgPlan    = currentOrgPlan
    isOwner         = true
    orgStatus       = 'active'
    enabledFeatures = ALL_FEATURES
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
    const user = session.user as any
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-512.png" alt="SiteFlo" width={32} height={22} />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-gray-900">Site</span>
            <span style={{ background: 'linear-gradient(135deg, #5eead4, #38bdf8, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Flo</span>
          </span>
        </div>

        {/* Suspended notice */}
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">⛔</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your organization&apos;s access has been suspended. Submit a support request below and we&apos;ll get back to you promptly.
          </p>
        </div>

        {/* Support ticket form */}
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Contact Support</p>
          <TicketForm
            initialName={user?.name ?? ''}
            initialEmail={user?.email ?? ''}
            initialOrg={orgName}
          />
        </div>

        {/* Sign out */}
        <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Sign out
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {adminOrgName && <AdminBanner orgName={adminOrgName} orgPlan={adminOrgPlan} />}
      {orgStatus === 'trial' && session.user.platformRole !== 'admin' && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-semibold py-2 px-4">
          Trial account — contact us to activate your full account.
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar isOwner={isOwner} perms={perms} orgName={orgName} orgLogo={orgLogo} trackWorkerTime={trackWorkerTime} enabledFeatures={enabledFeatures} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar orgName={orgName} orgLogo={orgLogo} />
          <main className="flex-1 px-4 py-4 pb-20 sm:px-6 sm:py-6 sm:pb-6 max-w-4xl w-full mx-auto">
            {children}
          </main>
        </div>
        <BottomNav isOwner={isOwner} perms={perms} trackWorkerTime={trackWorkerTime} enabledFeatures={enabledFeatures} />
      </div>
    </div>
  )
}
