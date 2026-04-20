'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, HardHat, Users, Calendar, Activity, Clock, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserPermissions } from '@/lib/permissions'
import type { FeatureKey } from '@/lib/plan-features'

interface BottomNavProps {
  isOwner: boolean
  perms: UserPermissions
  trackWorkerTime?: boolean
  enabledFeatures: FeatureKey[]
}

export function BottomNav({ isOwner, perms, trackWorkerTime, enabledFeatures }: BottomNavProps) {
  const pathname = usePathname()
  const has = (f: FeatureKey) => enabledFeatures.includes(f)

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Home',     show: true },
    { href: '/jobs',      icon: HardHat,         label: 'Jobs',     show: perms.can_view_jobs || isOwner },
    { href: '/calendar',  icon: Calendar,         label: 'Calendar', show: (perms.can_view_schedule || isOwner) && has('calendar') },
    { href: '/activity',  icon: Activity,         label: 'Activity', show: (perms.can_view_activity && !isOwner) && has('activity') },
    { href: '/crew',      icon: Users,            label: 'Workers',  show: isOwner && has('crew') },
    { href: '/receipts',  icon: Receipt,          label: 'Receipts', show: isOwner && has('receipt_tracking') },
    { href: '/clock',     icon: Clock,            label: 'Clock',    show: !!trackWorkerTime && has('time_clock') },
  ].filter((i) => i.show)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors',
                active ? 'text-teal-500' : 'text-gray-400'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
