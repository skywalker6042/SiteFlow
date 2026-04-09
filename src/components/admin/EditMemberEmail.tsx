'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader } from 'lucide-react'

export function EditMemberEmail({ orgId, userId, initialEmail }: { orgId: string; userId: string; initialEmail: string }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [draft, setDraft] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!draft.trim()) return
    setLoading(true)
    setError('')
    const body: Record<string, string> = { email: draft.trim() }
    if (password) body.password = password
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setEmail(draft.trim())
      setEditing(false)
      setPassword('')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to update')
    }
    setLoading(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            placeholder="Email"
            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-orange-400 w-48"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            placeholder="New password (optional)"
            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-orange-400 w-44"
          />
          <button onClick={save} disabled={loading} className="text-green-600 hover:text-green-700 disabled:opacity-50">
            {loading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => { setEditing(false); setDraft(email); setPassword(''); setError('') }} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <p className="text-sm font-medium text-gray-900">{email}</p>
      <button
        onClick={() => { setDraft(email); setEditing(true) }}
        className="text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit email / password"
      >
        <Pencil size={12} />
      </button>
    </div>
  )
}
