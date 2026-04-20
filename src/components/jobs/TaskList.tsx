'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, ClipboardList } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { calcTaskProgress } from '@/lib/phases'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { JobTask, JobPhase, TaskStatus } from '@/types'

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo:        'border-gray-300 text-gray-400',
  in_progress: 'border-gray-300 text-gray-400',
  done:        'border-green-500 text-green-600 bg-green-50',
}

function toggleStatus(current: TaskStatus): TaskStatus {
  return current === 'done' ? 'todo' : 'done'
}

interface TaskListProps {
  jobId: string
  initialTasks: JobTask[]
  phases: JobPhase[]
  canManage?: boolean
  canComplete?: boolean
}

export function TaskList({ jobId, initialTasks, phases, canManage = true, canComplete = true }: TaskListProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<JobTask[]>(initialTasks)
  const [showAdd, setShowAdd] = useState(false)

  // Sync when server re-renders after router.refresh() (e.g. job marked done)
  useEffect(() => { setTasks(initialTasks) }, [initialTasks])
  const [newName, setNewName] = useState('')
  const [newPhaseId, setNewPhaseId] = useState('')
  const [adding, setAdding] = useState(false)
  const [, startTransition] = useTransition()

  const progress = calcTaskProgress(tasks)

  // Group tasks by phase
  const grouped: { label: string | null; phaseId: string | null; tasks: JobTask[] }[] = []
  const byPhase: Record<string, JobTask[]> = {}
  const ungrouped: JobTask[] = []

  tasks.forEach((t) => {
    if (t.phase_id) {
      if (!byPhase[t.phase_id]) byPhase[t.phase_id] = []
      byPhase[t.phase_id].push(t)
    } else {
      ungrouped.push(t)
    }
  })

  // Add phase groups in phase order
  phases.forEach((p) => {
    if (byPhase[p.id]) {
      grouped.push({ label: p.name, phaseId: p.id, tasks: byPhase[p.id] })
    }
  })
  if (ungrouped.length > 0) {
    grouped.push({ label: null, phaseId: null, tasks: ungrouped })
  }

  async function handleStatusCycle(task: JobTask) {
    const next = toggleStatus(task.status)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t))
    await fetch(`/api/job-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/job-tasks/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/job-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, name: newName.trim(), phase_id: newPhaseId || null }),
    })
    const task = await res.json()
    setTasks((prev) => [...prev, task])
    setNewName('')
    setNewPhaseId('')
    setShowAdd(false)
    setAdding(false)
    startTransition(() => router.refresh())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ClipboardList size={15} />
            Tasks
            {tasks.length > 0 && (
              <span className="text-gray-400 font-normal">
                {tasks.filter((t) => t.status === 'done').length}/{tasks.length} done
              </span>
            )}
          </div>
          {canManage && (
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1 text-xs text-teal-500 font-medium"
            >
              <Plus size={13} />
              Add Task
            </button>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="mt-2">
            <ProgressBar value={progress} />
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Task name"
                required
                autoFocus
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
              >
                {adding ? '...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-sm">
                ✕
              </button>
            </div>
            {phases.length > 0 && (
              <select
                value={newPhaseId}
                onChange={(e) => setNewPhaseId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-600"
              >
                <option value="">No phase (general)</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </form>
        )}
      </CardHeader>

      <CardBody className={tasks.length === 0 && !showAdd ? 'py-6 text-center' : 'p-0'}>
        {tasks.length === 0 && !showAdd ? (
          <div>
            <p className="text-sm text-gray-400 mb-2">No tasks yet</p>
            {canManage && (
              <button onClick={() => setShowAdd(true)} className="text-xs text-teal-500 font-medium">
                Add your first task
              </button>
            )}
          </div>
        ) : (
          <div>
            {grouped.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {group.label}
                    </span>
                  </div>
                )}
                <ul className={cn('divide-y divide-gray-100', gi > 0 && !group.label && 'border-t border-gray-100')}>
                  {group.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        onClick={() => (canComplete || canManage) && handleStatusCycle(task)}
                        disabled={!canComplete && !canManage}
                        className={cn(
                          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors',
                          STATUS_STYLES[task.status],
                          !canComplete && !canManage && 'cursor-default'
                        )}
                        title={(canComplete || canManage) ? (task.status === 'done' ? 'Done — tap to undo' : 'Tap to complete') : task.status}
                      >
                        {task.status === 'done' ? <Check size={10} /> : null}
                      </button>

                      <span className={cn(
                        'flex-1 text-sm',
                        task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                      )}>
                        {task.name}
                      </span>

                      {task.weight !== null && (
                        <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                          ×{task.weight}
                        </span>
                      )}

                      {canManage && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
