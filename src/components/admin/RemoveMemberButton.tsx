'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function RemoveMemberButton({ orgId, userId }: { orgId: string; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    if (!confirm('Remove this member from the org?')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/orgs/${orgId}/members?userId=${userId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Remove member"
    >
      <Trash2 size={14} />
    </button>
  )
}
