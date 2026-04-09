'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, X } from 'lucide-react'

export function DeleteOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirm !== orgName) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete')
        return
      }
      router.push('/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Trash2 size={14} /> Delete Org
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Delete Organization</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete <strong>{orgName}</strong> and all its data — jobs, workers, tasks, photos, and members. This cannot be undone.
                </p>
              </div>
              <button onClick={() => { setOpen(false); setConfirm('') }} className="text-gray-400 hover:text-gray-700 ml-auto">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type <span className="font-mono font-bold text-gray-800">{orgName}</span> to confirm
              </label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={orgName}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setConfirm('') }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirm !== orgName}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Deleting…' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
