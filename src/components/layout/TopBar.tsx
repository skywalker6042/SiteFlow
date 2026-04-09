'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { OrgIdentityPill } from '@/components/ui/OrgIdentityPill'

const titles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/jobs':       'Jobs',
  '/backlog':    'Backlog',
  '/crew':       'Workers',
  '/financials': 'Financials',
  '/calendar':   'Calendar',
  '/settings':   'Settings',
  '/activity':   'Activity',
}

interface TopBarProps {
  orgName: string
  orgLogo: string | null
}

export function TopBar({ orgName, orgLogo }: TopBarProps) {
  const pathname = usePathname()
  const isHome   = pathname === '/dashboard'
  const title    = Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'SiteFlow'

  return (
    <header className="sm:hidden sticky top-0 z-30 bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center justify-between">
      {isHome ? (
        <OrgIdentityPill name={orgName} logoUrl={orgLogo} subtitle="General Contractor" size="sm" />
      ) : (
        <div className="flex items-center gap-2.5">
          <OrgIdentityPill name={orgName} logoUrl={orgLogo} size="sm" subtitle="" />
          <span className="text-gray-600 text-sm select-none">/</span>
          <h1 className="text-sm font-semibold text-white">{title}</h1>
        </div>
      )}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-gray-400 hover:text-white p-1.5 transition-colors"
        title="Sign out"
      >
        <LogOut size={18} />
      </button>
    </header>
  )
}
