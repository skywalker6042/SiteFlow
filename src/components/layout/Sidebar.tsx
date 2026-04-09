'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, HardHat, Users, DollarSign, Calendar, Settings, LayoutList, LogOut, Activity, Clock, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserPermissions } from '@/lib/permissions'
import { OrgIdentityPill } from '@/components/ui/OrgIdentityPill'

interface SidebarProps {
  isOwner: boolean
  perms: UserPermissions
  orgName: string
  orgLogo: string | null
  trackWorkerTime?: boolean
}

export function Sidebar({ isOwner, perms, orgName, orgLogo, trackWorkerTime }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  show: true },
    { href: '/jobs',       icon: HardHat,         label: 'Jobs',       show: perms.can_view_jobs || isOwner },
    { href: '/backlog',    icon: LayoutList,       label: 'Backlog',    show: isOwner },
    { href: '/calendar',   icon: Calendar,         label: 'Calendar',   show: perms.can_view_schedule || isOwner },
    { href: '/crew',       icon: Users,            label: 'Workers',    show: perms.can_view_crew || isOwner },
    { href: '/financials', icon: DollarSign,       label: 'Financials', show: perms.can_view_financials || isOwner },
    { href: '/activity',   icon: Activity,         label: 'Activity',   show: perms.can_view_activity || isOwner },
    { href: '/clock',      icon: Clock,            label: 'Time Clock', show: !!trackWorkerTime },
    { href: '/settings',   icon: Settings,         label: 'Settings',   show: isOwner },
    { href: '/support',    icon: LifeBuoy,          label: 'Support',    show: true },
  ].filter((i) => i.show)

  return (
    <aside className="hidden sm:flex flex-col w-60 min-h-screen bg-gray-900 text-white">
      {/* Org identity */}
      <div className="px-4 py-4 border-b border-gray-800">
        <OrgIdentityPill name={orgName} logoUrl={orgLogo} subtitle="General Contractor" />
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-orange-500 text-white shadow-sm'
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
