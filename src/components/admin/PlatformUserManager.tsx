'use client'

import { useState } from 'react'
import { UserPlus, Trash2, Crown, Shield, X } from 'lucide-react'

interface PlatformUser {
  id: string
  email: string
  platform_role: 'admin' | 'support'
  org_name: string | null
  created_at: string
}

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    icon: Crown,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    desc: 'Full platform access — manage orgs, billing, pricing, and all settings.',
  },
  support: {
    label: 'Support',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'Limited access — configure which sections they can see in Support Role Permissions below.',
  },
}

export function PlatformUserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: PlatformUser[]
  currentUserId: string
}) {
  const [users, setUsers] = useState<PlatformUser[]>(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'support'>('support')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/platform-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, platform_role: role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        return
      }
      // Add the new user to local state directly
      setUsers((prev) => {
        const exists = prev.find((u) => u.id === data.id)
        if (exists) return prev.map((u) => u.id === data.id ? { ...u, platform_role: data.platform_role } : u)
        return [...prev, { id: data.id, email: data.email, platform_role: data.platform_role, org_name: null, created_at: data.created_at }]
      })
      setShowAdd(false)
      setEmail('')
      setPassword('')
      setRole('support')
    } catch (err) {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangeRole(id: string, newRole: 'admin' | 'support') {
    try {
      const res = await fetch(`/api/admin/platform-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, platform_role: newRole } : u))
      }
    } catch {}
  }

  async function handleRemove(id: string, userEmail: string) {
    if (!confirm(`Revoke platform access for ${userEmail}?`)) return
    setRemoving(id)
    try {
      await fetch(`/api/admin/platform-users/${id}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } finally {
      setRemoving(null)
    }
  }

  const admins  = users.filter((u) => u.platform_role === 'admin')
  const support = users.filter((u) => u.platform_role === 'support')

  return (
    <div className="flex flex-col gap-6">
      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['admin', 'support'] as const).map((r) => {
          const cfg = ROLE_CONFIG[r]
          return (
            <div key={r} className={`rounded-xl border p-3 ${cfg.border} ${cfg.bg}`}>
              <div className={`flex items-center gap-1.5 font-semibold text-sm mb-1 ${cfg.color}`}>
                <cfg.icon size={14} /> {cfg.label}
              </div>
              <p className="text-xs text-gray-500">{cfg.desc}</p>
            </div>
          )
        })}
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No platform users yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[{ label: 'Admins', list: admins }, { label: 'Support', list: support }].map(({ label, list }) =>
            list.length === 0 ? null : (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
                  {list.map((u) => {
                    const cfg = ROLE_CONFIG[u.platform_role]
                    const isSelf = u.id === currentUserId
                    return (
                      <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <cfg.icon size={15} className={`shrink-0 ${cfg.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {u.email}
                              {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                            </p>
                            {u.org_name && <p className="text-xs text-gray-400">{u.org_name}</p>}
                          </div>
                        </div>
                        {!isSelf && (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={u.platform_role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value as 'admin' | 'support')}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                            >
                              <option value="admin">Admin</option>
                              <option value="support">Support</option>
                            </select>
                            <button
                              onClick={() => handleRemove(u.id, u.email)}
                              disabled={removing === u.id}
                              className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          )}
        </div>
      )}

      {/* Add user form */}
      {showAdd ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Add Platform User</p>
            <button type="button" onClick={() => { setShowAdd(false); setError('') }} className="text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'support')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="support">Support — limited access</option>
                <option value="admin">Admin — full platform access</option>
              </select>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <p className="text-xs text-gray-400">
              If this email already exists, their platform role will be updated.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setError('') }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {loading ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-teal-500 font-medium hover:text-teal-600 self-start"
        >
          <UserPlus size={15} /> Add Platform User
        </button>
      )}
    </div>
  )
}
