'use client'

import { useState } from 'react'
import { Plus, Trash2, Users, Check, X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { TeamWithMembers, Worker } from '@/types'

const COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
]

interface TeamManagerProps {
  initialTeams: TeamWithMembers[]
  allWorkers: Worker[]
}

export function TeamManager({ initialTeams, allWorkers }: TeamManagerProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>(initialTeams)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingMembers, setEditingMembers] = useState<Record<string, Set<string>>>({})
  const [savingMembers, setSavingMembers] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    const team = await res.json()
    setTeams((prev) => [...prev, team])
    setNewName('')
    setNewColor(COLORS[0])
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/teams/${id}`, { method: 'DELETE' })
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      const team = teams.find((t) => t.id === id)!
      setEditingMembers((prev) => ({
        ...prev,
        [id]: new Set(team.members.map((m) => m.id)),
      }))
    }
  }

  function toggleMember(teamId: string, workerId: string) {
    setEditingMembers((prev) => {
      const set = new Set(prev[teamId] ?? [])
      if (set.has(workerId)) set.delete(workerId)
      else set.add(workerId)
      return { ...prev, [teamId]: set }
    })
  }

  async function saveMembers(teamId: string) {
    setSavingMembers(teamId)
    const worker_ids = Array.from(editingMembers[teamId] ?? [])
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_ids }),
    })
    const members = await res.json()
    setTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, members } : t))
    setExpandedId(null)
    setSavingMembers(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Users size={15} />
          Teams
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {/* Create form */}
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Team name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-3 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {/* Color picker */}
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? '#111' : 'transparent',
                }}
              >
                {newColor === c && <Check size={10} className="text-white" />}
              </button>
            ))}
          </div>
        </form>

        {/* Team list */}
        {teams.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No teams yet</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teams.map((team) => {
              const isExpanded = expandedId === team.id
              const editing = editingMembers[team.id]

              return (
                <li key={team.id} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{team.name}</p>
                      <p className="text-xs text-gray-400">
                        {team.members.length === 0
                          ? 'No members'
                          : team.members.map((m) => m.name).join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(team.id)}
                      className="text-xs text-orange-500 font-medium hover:text-orange-600 px-1"
                    >
                      {isExpanded ? 'Done' : 'Edit Members'}
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-gray-200 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3 py-3 bg-gray-50">
                      <div className="flex flex-col gap-1 mb-3">
                        {allWorkers.map((worker) => {
                          const checked = editing?.has(worker.id) ?? false
                          return (
                            <button
                              key={worker.id}
                              onClick={() => toggleMember(team.id, worker.id)}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                                checked ? 'bg-orange-50' : 'hover:bg-white'
                              )}
                            >
                              <div className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                                checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                              )}>
                                {checked && <Check size={9} className="text-white" />}
                              </div>
                              <span className="text-sm text-gray-700">{worker.name}</span>
                              {worker.role && (
                                <span className="text-xs text-gray-400">{worker.role}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setExpandedId(null)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <X size={12} /> Cancel
                        </button>
                        <button
                          onClick={() => saveMembers(team.id)}
                          disabled={savingMembers === team.id}
                          className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                        >
                          <Check size={12} />
                          {savingMembers === team.id ? 'Saving...' : 'Save Members'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
