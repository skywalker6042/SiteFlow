'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronUp, ChevronDown, Trash2, Check } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { calcProgress, nextStatus } from '@/lib/phases'
import { cn, statusColor, statusLabel } from '@/lib/utils'
import type { JobPhase } from '@/types'

const statusIcon: Record<JobPhase['status'], string> = {
  not_started: '○',
  in_progress: '◑',
  done: '●',
}

const statusRing: Record<JobPhase['status'], string> = {
  not_started: 'border-gray-300 text-gray-400',
  in_progress: 'border-blue-400 text-blue-500 bg-blue-50',
  done: 'border-green-500 text-green-600 bg-green-50',
}

interface PhaseListProps {
  jobId: string
  initialPhases: JobPhase[]
}

export function PhaseList({ jobId, initialPhases }: PhaseListProps) {
  const router = useRouter()
  const [phases, setPhases] = useState<JobPhase[]>(initialPhases)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', notes: '' })
  const [adding, setAdding] = useState(false)
  const [isPending, startTransition] = useTransition()

  const progress = calcProgress(phases)

  async function handleStatusToggle(phase: JobPhase) {
    const newStatus = nextStatus(phase.status)
    // Optimistic update
    setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, status: newStatus } : p))
    await fetch(`/api/job-phases/${phase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    startTransition(() => router.refresh())
  }

  async function handleMove(phase: JobPhase, direction: 'up' | 'down') {
    const sorted = [...phases].sort((a, b) => a.order_index - b.order_index)
    const idx = sorted.findIndex((p) => p.id === phase.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    // Optimistic swap
    const next = [...sorted]
    ;[next[idx].order_index, next[swapIdx].order_index] = [next[swapIdx].order_index, next[idx].order_index]
    setPhases([...next])

    await fetch(`/api/job-phases/${phase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id))
    await fetch(`/api/job-phases/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setAdding(true)

    const res = await fetch('/api/job-phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, name: addForm.name, notes: addForm.notes }),
    })
    const newPhase = await res.json()
    setPhases((prev) => [...prev, newPhase])
    setAddForm({ name: '', notes: '' })
    setAdding(false)
    setAddOpen(false)
    startTransition(() => router.refresh())
  }

  const sorted = [...phases].sort((a, b) => a.order_index - b.order_index)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-700">Phases</span>
              {phases.length > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  {phases.filter((p) => p.status === 'done').length}/{phases.length} done
                </span>
              )}
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 text-xs text-orange-500 font-medium"
            >
              <Plus size={13} />
              Add Phase
            </button>
          </div>
          {phases.length > 0 && (
            <div className="mt-2">
              <ProgressBar value={progress} />
            </div>
          )}
        </CardHeader>

        <CardBody className={phases.length === 0 ? 'py-6 text-center' : 'p-0'}>
          {phases.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-gray-400">No phases yet</p>
              <button
                onClick={() => setAddOpen(true)}
                className="text-xs text-orange-500 font-medium"
              >
                Add your first phase
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sorted.map((phase, idx) => (
                <li key={phase.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Status toggle button */}
                  <button
                    onClick={() => handleStatusToggle(phase)}
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors',
                      statusRing[phase.status]
                    )}
                    title={`Status: ${statusLabel(phase.status)} — tap to advance`}
                  >
                    {phase.status === 'done' ? <Check size={13} /> : statusIcon[phase.status]}
                  </button>

                  {/* Phase name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      phase.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
                    )}>
                      {phase.name}
                    </p>
                    {phase.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{phase.notes}</p>
                    )}
                  </div>

                  {/* Reorder + delete */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMove(phase, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(phase, 'down')}
                      disabled={idx === sorted.length - 1}
                      className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="p-1 text-gray-200 hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Phase">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Phase Name *"
            id="phase-name"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Framing, Drywall, Paint..."
            autoFocus
          />
          <Textarea
            label="Notes (optional)"
            id="phase-notes"
            value={addForm.notes}
            onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Any details for this phase..."
          />
          <Button type="submit" disabled={adding}>
            {adding ? 'Adding...' : 'Add Phase'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
