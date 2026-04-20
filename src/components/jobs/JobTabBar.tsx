'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Tab { id: string; label: string; count: number }

export function JobTabBar({ activeTab, counts }: { activeTab: string; counts: Record<string, number> }) {
  const tabs: Tab[] = [
    { id: 'in-progress', label: 'In Progress', count: counts['in-progress'] ?? 0 },
    { id: 'backlog',     label: 'Backlog',      count: counts['backlog']     ?? 0 },
    { id: 'completed',   label: 'Completed',    count: counts['completed']   ?? 0 },
  ]

  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {tabs.map(({ id, label, count }) => (
        <Link
          key={id}
          href={`/jobs?tab=${id}`}
          className={cn(
            'flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5',
            activeTab === id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {label}
          {count > 0 && (
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
              activeTab === id ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'
            )}>
              {count}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
