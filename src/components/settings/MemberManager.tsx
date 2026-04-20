'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2, Crown, UserCircle, X } from 'lucide-react'
import type { OrgRole } from '@/types'

interface Member {
  member_id: string
  user_id: string
  email: string
  role: 'owner' | 'worker'
  org_role_id: string | null
  org_role_name: string | null
  org_role_color: string | null
}

interface MemberManagerProps {
  initialMembers: Member[]
  roles: OrgRole[]
  currentUserId: string
}

export function MemberManager({ initialMembers, roles, currentUserId }: MemberManagerProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'worker'>('worker')
  const [orgRoleId, setOrgRoleId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
          org_role_id: orgRoleId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add member')
        return
      }
      setShowAdd(false)
      setEmail('')
      setPassword('')
      setRole('worker')
      setOrgRoleId('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member? They will lose access to the organization.')) return
    setRemoving(userId)
    try {
      await fetch(`/api/org/members?userId=${userId}`, { method: 'DELETE' })
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Member list */}
      {members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">No members yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          {members.map((m) => (
            <li key={m.member_id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                {m.role === 'owner'
                  ? <Crown size={15} className="text-teal-400 shrink-0" />
                  : <UserCircle size={15} className="text-gray-400 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                    {m.org_role_name && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: m.org_role_color ?? '#6b7280' }}
                      >
                        {m.org_role_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {m.user_id !== currentUserId && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  disabled={removing === m.user_id}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add member form */}
      {showAdd ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Add User</p>
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
                placeholder="user@company.com"
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Access Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'owner' | 'worker')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="owner">Owner (full access)</option>
                <option value="worker">Worker (role-based access)</option>
              </select>
            </div>
            {role === 'worker' && roles.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role (optional)</label>
                <select
                  value={orgRoleId}
                  onChange={(e) => setOrgRoleId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Default worker permissions</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
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
                disabled={loading || !email.trim() || !password}
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
          <UserPlus size={15} /> Add User
        </button>
      )}
    </div>
  )
}
