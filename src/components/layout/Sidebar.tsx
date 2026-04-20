'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, HardHat, Users, DollarSign, Calendar, Settings, LogOut, Activity, Clock, LifeBuoy, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserPermissions } from '@/lib/permissions'
import type { FeatureKey } from '@/lib/plan-features'
import { OrgIdentityPill } from '@/components/ui/OrgIdentityPill'

interface SidebarProps {
  isOwner: boolean
  perms: UserPermissions
  orgName: string
  orgLogo: string | null
  trackWorkerTime?: boolean
  enabledFeatures: FeatureKey[]
}

export function Sidebar({ isOwner, perms, orgName, orgLogo, trackWorkerTime, enabledFeatures }: SidebarProps) {
  const pathname = usePathname()
  const has = (f: FeatureKey) => enabledFeatures.includes(f)

  const navItems = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  show: true },
    { href: '/jobs',       icon: HardHat,         label: 'Jobs',       show: perms.can_view_jobs || isOwner },
    { href: '/calendar',   icon: Calendar,         label: 'Calendar',   show: (perms.can_view_schedule || isOwner) && has('calendar') },
    { href: '/crew',       icon: Users,            label: 'Workers',    show: (perms.can_view_crew || isOwner) && has('crew') },
    { href: '/financials', icon: DollarSign,       label: 'Financials', show: (perms.can_view_financials || isOwner) && has('financials') },
    { href: '/receipts',   icon: Receipt,          label: 'Receipts',   show: isOwner && has('receipt_tracking') },
    { href: '/activity',   icon: Activity,         label: 'Activity',   show: (perms.can_view_activity || isOwner) && has('activity') },
    { href: '/clock',      icon: Clock,            label: 'Time Clock', show: !!trackWorkerTime && has('time_clock') },
    { href: '/settings',   icon: Settings,         label: 'Settings',   show: isOwner },
    { href: '/support',    icon: LifeBuoy,          label: 'Support',    show: true },
  ].filter((i) => i.show)

  return (
    <aside className="hidden sm:flex flex-col w-60 sticky top-0 h-screen bg-gray-900 text-white">
      {/* App brand */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-512.png" alt="SiteFlo" width={32} height={22} />
        <span className="text-lg font-bold tracking-tight leading-none">
          <span className="text-white">Site</span>
          <span style={{ background: 'linear-gradient(135deg, #5eead4, #38bdf8, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Flo</span>
        </span>
      </div>

      {/* Org identity */}
      <div className="px-4 py-3 border-b border-gray-800">
        <OrgIdentityPill name={orgName} logoUrl={orgLogo} subtitle="General Contractor" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 w-full transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
