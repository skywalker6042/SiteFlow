'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Plus, Pencil, Trash2, Users, Check, X, Shield } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { WorkerForm } from './WorkerForm'
import { SetupLoginButton } from './SetupLoginButton'
import { cn } from '@/lib/utils'
import type { WorkerWithSpecialties, TeamWithMembers, Specialty, OrgRole } from '@/types'

const COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
]

type WorkerRow = WorkerWithSpecialties & {
  login_email?: string | null
  org_role_id?: string | null
  role_name?: string | null
  role_color?: string | null
}

interface CrewPageProps {
  initialWorkers: WorkerRow[]
  initialTeams: TeamWithMembers[]
  specialties: Specialty[]
  roles: OrgRole[]
}

export function CrewPage({ initialWorkers, initialTeams, specialties, roles }: CrewPageProps) {
  const router = useRouter()

  // --- Workers state ---
  const [workers, setWorkers] = useState<WorkerRow[]>(initialWorkers)
  const [addOpen, setAddOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerRow | null>(null)
  const [assigningRoleFor, setAssigningRoleFor] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState<string | null>(null)

  async function handleDeleteWorker(id: string) {
    setWorkers((prev) => prev.filter((w) => w.id !== id))
    await fetch(`/api/workers/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function handleWorkerSaved(updated?: WorkerWithSpecialties) {
    if (updated) {
      setWorkers((prev) => prev.map((w) => w.id === updated.id ? { ...w, ...updated } : w))
    } else {
      router.refresh()
    }
    setAddOpen(false)
    setEditWorker(null)
  }

  async function handleAssignRole(workerId: string, roleId: string | null) {
    setRoleLoading(workerId)
    await fetch(`/api/workers/${workerId}/assign-role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId }),
    })
    const role = roles.find((r) => r.id === roleId) ?? null
    setWorkers((prev) => prev.map((w) =>
      w.id === workerId
        ? { ...w, org_role_id: role?.id ?? null, role_name: role?.name ?? null, role_color: role?.color ?? null }
        : w
    ))
    setAssigningRoleFor(null)
    setRoleLoading(null)
  }

  // --- Crews (teams) state ---
  const [teams, setTeams] = useState<TeamWithMembers[]>(initialTeams)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState(COLORS[0])
  const [addingTeam, setAddingTeam] = useState(false)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [editingMembers, setEditingMembers] = useState<Record<string, Set<string>>>({})
  const [savingMembers, setSavingMembers] = useState<string | null>(null)

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setAddingTeam(true)
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName.trim(), color: newTeamColor }),
    })
    const team = await res.json()
    setTeams((prev) => [...prev, team])
    setNewTeamName('')
    setNewTeamColor(COLORS[0])
    setAddingTeam(false)
  }

  async function handleDeleteTeam(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/teams/${id}`, { method: 'DELETE' })
  }

  function toggleExpandTeam(id: string) {
    if (expandedTeamId === id) {
      setExpandedTeamId(null)
    } else {
      setExpandedTeamId(id)
      const team = teams.find((t) => t.id === id)!
      setEditingMembers((prev) => ({
        ...prev,
        [id]: new Set(team.members.map((m) => m.id)),
      }))
    }
  }

  function toggleTeamMember(teamId: string, workerId: string) {
    setEditingMembers((prev) => {
      const set = new Set(prev[teamId] ?? [])
      if (set.has(workerId)) set.delete(workerId)
      else set.add(workerId)
      return { ...prev, [teamId]: set }
    })
  }

  async function saveTeamMembers(teamId: string) {
    setSavingMembers(teamId)
    const worker_ids = Array.from(editingMembers[teamId] ?? [])
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_ids }),
    })
    const members = await res.json()
    setTeams((prev) => prev.map((t) => t.id === teamId ? { ...t, members } : t))
    setExpandedTeamId(null)
    setSavingMembers(null)
  }

  return (
    <>
      {/* Workers section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Workers</h2>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 text-sm text-teal-500 font-medium hover:text-teal-600"
          >
            <Plus size={15} />
            Add Worker
          </button>
        </div>

        {workers.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center">
              <p className="text-gray-400 text-sm">No workers yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {workers.map((worker) => {
              const workerSpecialties = Array.isArray(worker.specialties) ? worker.specialties : []
              const isAssigningRole = assigningRoleFor === worker.id
              return (
                <Card key={worker.id}>
                  <CardBody className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      {worker.name[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{worker.name}</p>
                      {worker.role && <p className="text-xs text-gray-400">{worker.role}</p>}
                      {workerSpecialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {workerSpecialties.map((s) => (
                            <span key={s.id} className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Role badge / picker */}
                      <div className="mt-1.5">
                        {isAssigningRole ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <button
                              onClick={() => handleAssignRole(worker.id, null)}
                              disabled={roleLoading === worker.id}
                              className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium hover:bg-gray-200 transition-colors"
                            >
                              No role
                            </button>
                            {roles.map((role) => (
                              <button
                                key={role.id}
                                onClick={() => handleAssignRole(worker.id, role.id)}
                                disabled={roleLoading === worker.id}
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: role.color + '22', color: role.color }}
                              >
                                {role.name}
                              </button>
                            ))}
                            <button
                              onClick={() => setAssigningRoleFor(null)}
                              className="text-gray-400 hover:text-gray-600 p-0.5"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningRoleFor(worker.id)}
                            className="flex items-center gap-1"
                          >
                            {worker.role_name ? (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                style={{ backgroundColor: (worker.role_color ?? '#6b7280') + '22', color: worker.role_color ?? '#6b7280' }}
                              >
                                <Shield size={8} /> {worker.role_name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 hover:text-teal-500 font-medium flex items-center gap-0.5 transition-colors">
                                <Shield size={9} /> Assign role
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="mt-1">
                        <SetupLoginButton
                          workerId={worker.id}
                          workerName={worker.name}
                          loginEmail={worker.login_email ?? null}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {worker.phone && (
                        <a href={`tel:${worker.phone}`} className="text-teal-500 p-1.5 hover:bg-teal-50 rounded-lg">
                          <Phone size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => setEditWorker(worker)}
                        className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-50 rounded-lg"
                        title="Edit worker"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteWorker(worker.id)}
                        className="text-gray-200 hover:text-red-400 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove worker"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Crews (teams) section */}
      <div className="flex flex-col gap-3 mt-2">
        <h2 className="text-base font-semibold text-gray-800">Crews</h2>

        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-gray-600">Create a crew to quickly assign a group to work sessions</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {/* Create form */}
            <form onSubmit={handleCreateTeam} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Crew name"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={addingTeam || !newTeamName.trim()}
                  className="px-3 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTeamColor(c)}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: newTeamColor === c ? '#111' : 'transparent' }}
                  >
                    {newTeamColor === c && <Check size={10} className="text-white" />}
                  </button>
                ))}
              </div>
            </form>

            {/* Crew list */}
            {teams.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">No crews yet</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {teams.map((team) => {
                  const isExpanded = expandedTeamId === team.id
                  const editing = editingMembers[team.id]

                  return (
                    <li key={team.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{team.name}</p>
                          <p className="text-xs text-gray-400">
                            {team.members.length === 0 ? 'No members' : team.members.map((m) => m.name).join(', ')}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleExpandTeam(team.id)}
                          className="text-xs text-teal-500 font-medium hover:text-teal-600 px-1"
                        >
                          {isExpanded ? 'Done' : 'Edit Members'}
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-gray-200 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50">
                          <div className="flex flex-col gap-1 mb-3">
                            {workers.map((worker) => {
                              const checked = editing?.has(worker.id) ?? false
                              return (
                                <button
                                  key={worker.id}
                                  onClick={() => toggleTeamMember(team.id, worker.id)}
                                  className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                                    checked ? 'bg-teal-50' : 'hover:bg-white'
                                  )}
                                >
                                  <div className={cn(
                                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                                    checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                                  )}>
                                    {checked && <Check size={9} className="text-white" />}
                                  </div>
                                  <span className="text-sm text-gray-700">{worker.name}</span>
                                  {worker.role && <span className="text-xs text-gray-400">{worker.role}</span>}
                                </button>
                              )
                            })}
                            {workers.length === 0 && (
                              <p className="text-sm text-gray-400 py-1">Add workers first</p>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedTeamId(null)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button
                              onClick={() => saveTeamMembers(team.id)}
                              disabled={savingMembers === team.id}
                              className="flex items-center gap-1 text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
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
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Worker">
        <WorkerForm specialties={specialties} onSuccess={handleWorkerSaved} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editWorker} onClose={() => setEditWorker(null)} title="Edit Worker">
        {editWorker && (
          <WorkerForm
            specialties={specialties}
            worker={editWorker}
            onSuccess={handleWorkerSaved}
          />
        )}
      </Modal>
    </>
  )
}
