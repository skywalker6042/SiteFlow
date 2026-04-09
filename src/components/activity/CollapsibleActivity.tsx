'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { ActivityFeed } from './ActivityFeed'

export function CollapsibleActivity({ logs }: { logs: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <span className="text-sm font-semibold text-gray-700">Activity</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {!open && <span>{logs.length} event{logs.length !== 1 ? 's' : ''}</span>}
          {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <CardBody className="py-1 pt-0">
          <ActivityFeed logs={logs} />
        </CardBody>
      )}
    </Card>
  )
}
