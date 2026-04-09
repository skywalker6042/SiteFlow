'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'

export function ViewOrgButton({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/set-active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (res.ok) {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Eye size={13} />
      {loading ? 'Entering…' : 'View Org'}
    </button>
  )
}
