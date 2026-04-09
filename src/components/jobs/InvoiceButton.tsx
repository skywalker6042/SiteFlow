'use client'

import { useState } from 'react'
import { FileText, Loader } from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export function InvoiceButton({ jobId, initialToken }: { jobId: string; initialToken: string | null }) {
  const [token, setToken]   = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(false)

  async function open() {
    let t = token
    if (!t) {
      setLoading(true)
      try {
        const res  = await fetch(`/api/jobs/${jobId}/share`, { method: 'POST' })
        const data = await res.json()
        t = data.token
        setToken(t)
      } finally {
        setLoading(false)
      }
    }
    window.open(`${BASE_URL}/share/${t}/invoice`, '_blank')
  }

  return (
    <button
      onClick={open}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
      Invoice
    </button>
  )
}
