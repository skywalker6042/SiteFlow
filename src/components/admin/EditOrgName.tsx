'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader } from 'lucide-react'

export function EditOrgName({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!draft.trim() || draft === name) { setEditing(false); return }
    setLoading(true)
    const res = await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft.trim() }),
    })
    if (res.ok) {
      setName(draft.trim())
      setEditing(false)
    }
    setLoading(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="text-xl font-bold text-gray-900 border-b-2 border-teal-400 bg-transparent outline-none w-64"
        />
        <button onClick={save} disabled={loading} className="text-green-600 hover:text-green-700 disabled:opacity-50">
          {loading ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
        <button onClick={() => { setEditing(false); setDraft(name) }} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-xl font-bold text-gray-900">{name}</h1>
      <button
        onClick={() => { setDraft(name); setEditing(true) }}
        className="text-gray-300 hover:text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Rename org"
      >
        <Pencil size={14} />
      </button>
    </div>
  )
}
