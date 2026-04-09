'use client'

import { useState } from 'react'
import { Users, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Worker, TeamWithMembers } from '@/types'

interface SessionCrewPickerProps {
  sessionId: string
  sessionDate: string
  currentWorkers: Worker[]
  allWorkers: Worker[]
  teams: TeamWithMembers[]
  onClose: () => void
  onSave: (workers: Worker[]) => void
}

export function SessionCrewPicker({
  sessionId,
  sessionDate,
  currentWorkers,
  allWorkers,
  teams,
  onClose,
  onSave,
}: SessionCrewPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentWorkers.map((w) => w.id))
  )
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addTeam(members: Worker[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      members.forEach((m) => next.add(m.id))
      return next
    })
  }

  function removeTeam(members: Worker[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      members.forEach((m) => next.delete(m.id))
      return next
    })
  }

  function teamFullySelected(members: Worker[]) {
    return members.length > 0 && members.every((m) => selected.has(m.id))
  }

  async function handleSave() {
    setSaving(true)
    const worker_ids = Array.from(selected)
    const res = await fetch('/api/session-workers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, worker_ids }),
    })
    const workers = await res.json()
    onSave(workers)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">Assign Crew</span>
            <span className="text-xs text-gray-400">{sessionDate}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-4">
          {/* Crews */}
          {teams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Crews</p>
              <div className="flex flex-col gap-1.5">
                {teams.map((team) => {
                  const allIn = teamFullySelected(team.members)
                  return (
                    <div key={team.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="text-sm font-medium text-gray-800">{team.name}</span>
                        </div>
                        {team.members.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5 ml-4">
                            {team.members.map((m) => m.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => allIn ? removeTeam(team.members) : addTeam(team.members)}
                        disabled={team.members.length === 0}
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
                          allIn
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          team.members.length === 0 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        {allIn ? 'Remove All' : 'Add All'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Individual crew members */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Crew Members</p>
            <div className="flex flex-col gap-1">
              {allWorkers.map((worker) => {
                const checked = selected.has(worker.id)
                return (
                  <button
                    key={worker.id}
                    onClick={() => toggle(worker.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      checked ? 'bg-orange-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center border flex-shrink-0',
                      checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                    )}>
                      {checked && <Check size={11} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{worker.name}</p>
                      {worker.role && <p className="text-xs text-gray-400">{worker.role}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {selected.size} worker{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
