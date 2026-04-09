'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'new',         label: 'New',         cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'in_progress', label: 'In Progress',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'completed',   label: 'Completed',    cls: 'bg-green-100 text-green-700 border-green-200' },
]

export function SetupStatusActions({ requestId, status: initStatus }: { requestId: string; status: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(initStatus)
  const [saving, setSaving] = useState(false)

  async function update(s: string) {
    setSaving(true)
    await fetch(`/api/admin/setup-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    })
    setStatus(s)
    setSaving(false)
    router.refresh()
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
      <div className="flex flex-col gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            disabled={saving}
            onClick={() => update(s.value)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border text-left transition-all ${
              status === s.value ? s.cls : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
