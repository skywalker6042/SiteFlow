'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'

export function AdminBanner({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleExit() {
    setLoading(true)
    try {
      await fetch('/api/admin/clear-active-org', { method: 'POST' })
      router.push('/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle size={15} className="shrink-0" />
        <span>Admin Mode — viewing <strong>{orgName}</strong></span>
      </div>
      <button
        onClick={handleExit}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <X size={12} />
        {loading ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  )
}
