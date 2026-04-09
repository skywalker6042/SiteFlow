'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES   = ['open', 'in_progress', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'medium', 'high'] as const

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolved:    'bg-green-100 text-green-700 border-green-200',
  closed:      'bg-gray-100 text-gray-500 border-gray-200',
}
const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-500 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high:   'bg-red-100 text-red-700 border-red-200',
}
const STATUS_LABELS: Record<string, string>   = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }
const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' }

interface Props { ticketId: string; status: string; priority: string }

export function TicketStatusActions({ ticketId, status: initStatus, priority: initPriority }: Props) {
  const router = useRouter()
  const [status,   setStatus]   = useState(initStatus)
  const [priority, setPriority] = useState(initPriority)
  const [saving, setSaving] = useState(false)

  async function update(field: 'status' | 'priority', value: string) {
    setSaving(true)
    await fetch(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (field === 'status')   setStatus(value)
    if (field === 'priority') setPriority(value)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              disabled={saving}
              onClick={() => update('status', s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                status === s
                  ? STATUS_COLORS[s]
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Priority</p>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map(p => (
            <button
              key={p}
              disabled={saving}
              onClick={() => update('priority', p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                priority === p
                  ? PRIORITY_COLORS[p]
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
