'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Phone, X, Edit2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Worker, WorkerWithSpecialties } from '@/types'

interface CrewAssignmentProps {
  jobId: string
  initialWorkers: Worker[]
  allWorkers: WorkerWithSpecialties[]
}

export function CrewAssignment({ jobId, initialWorkers, allWorkers }: CrewAssignmentProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialWorkers.map((w) => w.id)))
  const [saving, setSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleWorker(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/job-workers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, worker_ids: Array.from(selected) }),
    })
    setSaving(false)
    setOpen(false)
    startTransition(() => router.refresh())
  }

  // Show current workers (from server data, refreshed after save)
  const assignedWorkers = allWorkers.filter((w) => initialWorkers.some((iw) => iw.id === w.id))

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Users size={15} />
              Crew ({initialWorkers.length})
            </div>
            <button
              onClick={() => {
                setSelected(new Set(initialWorkers.map((w) => w.id)))
                setOpen(true)
              }}
              className="flex items-center gap-1 text-xs text-teal-500 font-medium"
            >
              <Edit2 size={12} />
              Manage
            </button>
          </div>
        </CardHeader>
        <CardBody>
          {assignedWorkers.length === 0 ? (
            <button onClick={() => setOpen(true)} className="text-sm text-gray-400 hover:text-teal-500 transition-colors">
              No crew assigned — tap to assign
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {assignedWorkers.map((w) => (
                <div key={w.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{w.name}</p>
                    {w.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {w.specialties.map((s) => (
                          <span key={s.id} className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {w.phone && (
                    <a href={`tel:${w.phone}`} className="text-teal-500 p-1.5 hover:bg-teal-50 rounded-lg flex-shrink-0">
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Assign Crew">
        <div className="flex flex-col gap-4">
          {allWorkers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No workers in your crew yet. Add workers first.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {allWorkers.map((worker) => {
                const checked = selected.has(worker.id)
                return (
                  <label
                    key={worker.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWorker(worker.id)}
                      className="mt-0.5 w-4 h-4 rounded accent-teal-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {worker.role && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {worker.role}
                          </span>
                        )}
                        {worker.specialties?.map((s) => (
                          <span key={s.id} className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : `Save (${selected.size} assigned)`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
