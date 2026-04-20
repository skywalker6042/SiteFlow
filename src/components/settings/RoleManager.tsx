'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgRole } from '@/types'
import type { UserPermissions } from '@/lib/permissions'
import { DEFAULT_WORKER_PERMISSIONS } from '@/lib/permissions'

// ─── Permission groups for the toggle grid ────────────────────────────────────

type PermKey = keyof UserPermissions

interface PermGroup {
  label: string
  perms: { key: PermKey; label: string }[]
}

const PERM_GROUPS: PermGroup[] = [
  {
    label: 'Jobs',
    perms: [
      { key: 'can_view_jobs',           label: 'View jobs' },
      { key: 'can_edit_jobs',           label: 'Edit job details' },
      { key: 'can_view_job_financials', label: 'View financial data (dashboard KPIs, job amounts)' },
      { key: 'can_view_all_jobs',       label: 'See all jobs (not just assigned)' },
    ],
  },
  {
    label: 'Schedule',
    perms: [
      { key: 'can_view_schedule',   label: 'View work days' },
      { key: 'can_manage_schedule', label: 'Add / edit work days' },
    ],
  },
  {
    label: 'Tasks',
    perms: [
      { key: 'can_view_tasks',     label: 'View tasks' },
      { key: 'can_complete_tasks', label: 'Mark tasks done' },
      { key: 'can_manage_tasks',   label: 'Add / edit / delete tasks' },
    ],
  },
  {
    label: 'Change Orders',
    perms: [
      { key: 'can_view_change_orders',    label: 'View change orders' },
      { key: 'can_manage_change_orders',  label: 'Add / approve change orders' },
    ],
  },
  {
    label: 'Photos',
    perms: [
      { key: 'can_upload_photos', label: 'Upload photos' },
    ],
  },
  {
    label: 'Crew',
    perms: [
      { key: 'can_view_crew', label: 'View crew list' },
    ],
  },
  {
    label: 'Financials & Reports',
    perms: [
      { key: 'can_view_financials', label: 'View financial reports' },
      { key: 'can_view_activity',   label: 'View activity log' },
    ],
  },
]

const COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ec4899', '#f59e0b', '#6b7280', '#ef4444',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PermToggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full transition-colors',
        checked ? 'bg-teal-50' : 'hover:bg-gray-50'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
        checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
      )}>
        {checked && <Check size={9} className="text-white" />}
      </div>
      <span className="text-xs text-gray-700">{label}</span>
    </button>
  )
}

function RoleCard({
  role,
  onUpdate,
  onDelete,
}: {
  role: OrgRole
  onUpdate: (updated: OrgRole) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(role.name)
  const [color, setColor] = useState(role.color)
  const [perms, setPerms] = useState<UserPermissions>({ ...DEFAULT_WORKER_PERMISSIONS, ...role.permissions })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function setperm(key: PermKey, val: boolean) {
    setPerms((p) => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/org-roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, permissions: perms }),
    })
    const updated = await res.json()
    onUpdate(updated)
    setEditing(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete the "${role.name}" role? Workers assigned this role will keep their current permissions.`)) return
    setDeleting(true)
    await fetch(`/api/org-roles/${role.id}`, { method: 'DELETE' })
    onDelete(role.id)
  }

  const trueCount = Object.values(perms).filter(Boolean).length
  const totalCount = Object.keys(perms).length

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {editing ? (
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                style={{ backgroundColor: c, borderColor: color === c ? '#111' : 'transparent' }}
              >
                {color === c && <Check size={8} className="text-white" />}
              </button>
            ))}
          </div>
        ) : (
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
        )}

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-medium border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          ) : (
            <>
              <p className="text-sm font-medium text-gray-800">{role.name}</p>
              <p className="text-xs text-gray-400">{trueCount} of {totalCount} permissions enabled</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setName(role.name); setColor(role.color) }}
                className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700 flex items-center gap-1">
                <X size={12} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !name.trim()}
                className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 disabled:opacity-50 flex items-center gap-1 font-medium">
                <Check size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(true); setExpanded(true) }}
                className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-50 rounded-lg">
                <Pencil size={13} />
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-gray-200 hover:text-red-400 p-1 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
              <button onClick={() => setExpanded((v) => !v)}
                className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-50 rounded-lg">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded permission grid */}
      {(expanded || editing) && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
          <div className="flex flex-col gap-4">
            {PERM_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">{group.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {group.perms.map(({ key, label }) => (
                    <PermToggle
                      key={key}
                      label={label}
                      checked={perms[key]}
                      onChange={editing ? (v) => setperm(key, v) : () => {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!editing && (
            <p className="text-[10px] text-gray-400 mt-3 px-1">Tap the pencil icon to edit permissions for this role.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RoleManager({ initialRoles }: { initialRoles: OrgRole[] }) {
  const [roles, setRoles] = useState<OrgRole[]>(initialRoles)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newPerms, setNewPerms] = useState<UserPermissions>({ ...DEFAULT_WORKER_PERMISSIONS })
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  function setNewPerm(key: PermKey, val: boolean) {
    setNewPerms((p) => ({ ...p, [key]: val }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/org-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor, permissions: newPerms }),
    })
    const role = await res.json()
    setRoles((prev) => [...prev, role])
    setNewName('')
    setNewColor(COLORS[0])
    setNewPerms({ ...DEFAULT_WORKER_PERMISSIONS })
    setShowCreate(false)
    setCreating(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          onUpdate={(updated) => setRoles((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
          onDelete={(id) => setRoles((prev) => prev.filter((r) => r.id !== id))}
        />
      ))}

      {roles.length === 0 && !showCreate && (
        <p className="text-sm text-gray-400 text-center py-2">No roles yet. Create one below.</p>
      )}

      {showCreate ? (
        <form onSubmit={handleCreate} className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">New Role</p>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Role name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              required
            />
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                  style={{ backgroundColor: c, borderColor: newColor === c ? '#111' : 'transparent' }}
                >
                  {newColor === c && <Check size={9} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Permission grid for new role */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-600">Permissions</p>
            {PERM_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">{group.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {group.perms.map(({ key, label }) => (
                    <PermToggle key={key} label={label} checked={newPerms[key]} onChange={(v) => setNewPerm(key, v)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={creating || !newName.trim()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg">
              {creating ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm text-teal-500 font-medium hover:text-teal-600 self-start"
        >
          <Plus size={15} /> Create Role
        </button>
      )}
    </div>
  )
}
