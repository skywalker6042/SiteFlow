'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CalendarDays, Check, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { SessionCrewPicker } from './SessionCrewPicker'
import type { JobSessionWithCrew, Worker, TeamWithMembers, SessionStatus } from '@/types'

const STATUS_STYLES: Record<SessionStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  planned:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  not_started: 'Not Started',
  planned:     'Planned',
  in_progress: 'In Progress',
  done:        'Done',
}

const NEXT_STATUS: Record<SessionStatus, SessionStatus> = {
  not_started: 'planned',
  planned:     'in_progress',
  in_progress: 'done',
  done:        'not_started',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface SessionListProps {
  jobId: string
  initialSessions: JobSessionWithCrew[]
  allWorkers: Worker[]
  teams: TeamWithMembers[]
}

export function SessionList({ jobId, initialSessions, allWorkers, teams }: SessionListProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<JobSessionWithCrew[]>(initialSessions)
  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [crewSession, setCrewSession] = useState<JobSessionWithCrew | null>(null)
  const [, startTransition] = useTransition()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return
    setAdding(true)

    const res = await fetch('/api/job-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, date: newDate, notes: newNotes }),
    })
    const session = await res.json()
    setSessions((prev) => [...prev, { ...session, workers: [] }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewDate('')
    setNewNotes('')
    setShowAddForm(false)
    setAdding(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/job-sessions/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  async function handleStatusCycle(session: JobSessionWithCrew) {
    const next = NEXT_STATUS[session.status]
    setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: next } : s))
    await fetch(`/api/job-sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    startTransition(() => router.refresh())
  }

  function handleCrewSaved(sessionId: string, workers: Worker[]) {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, workers } : s))
    setCrewSession(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <CalendarDays size={15} />
              Work Sessions
              {sessions.length > 0 && (
                <span className="text-gray-400 font-normal">({sessions.length})</span>
              )}
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-teal-500 font-medium"
            >
              <Plus size={13} />
              Add Day
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={adding || !newDate}
                  className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
                >
                  {adding ? '...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </form>
          )}
        </CardHeader>

        <CardBody className={sessions.length === 0 && !showAddForm ? 'py-6 text-center' : 'p-0'}>
          {sessions.length === 0 && !showAddForm ? (
            <div>
              <p className="text-sm text-gray-400 mb-2">No work sessions scheduled</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-xs text-teal-500 font-medium"
              >
                Schedule the first day
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-start gap-3 px-4 py-3">
                  {/* Status toggle */}
                  <button
                    onClick={() => handleStatusCycle(session)}
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors mt-0.5',
                      STATUS_STYLES[session.status]
                    )}
                    title={`${STATUS_LABELS[session.status]} — tap to advance`}
                  >
                    {session.status === 'done' ? <Check size={11} /> : null}
                  </button>

                  {/* Date + notes + crew */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      session.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
                    )}>
                      {formatDate(session.date)}
                    </p>
                    {session.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{session.notes}</p>
                    )}
                    {/* Crew chips */}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {session.workers.map((w) => (
                        <span
                          key={w.id}
                          className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium"
                        >
                          {w.name}
                        </span>
                      ))}
                      <button
                        onClick={() => setCrewSession(session)}
                        className="flex items-center gap-0.5 text-[10px] text-teal-500 font-medium hover:text-teal-600"
                      >
                        <Users size={10} />
                        {session.workers.length === 0 ? 'Assign crew' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  {/* Status label */}
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5', STATUS_STYLES[session.status])}>
                    {STATUS_LABELS[session.status]}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {crewSession && (
        <SessionCrewPicker
          sessionId={crewSession.id}
          sessionDate={formatDate(crewSession.date)}
          currentWorkers={crewSession.workers}
          allWorkers={allWorkers}
          teams={teams}
          onClose={() => setCrewSession(null)}
          onSave={(workers) => handleCrewSaved(crewSession.id, workers)}
        />
      )}
    </>
  )
}
