'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CalendarDays, Check, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { WorkDayCrewPicker } from './WorkDayCrewPicker'
import type { WorkDayWithCrew, Worker, TeamWithMembers, WorkDayStatus } from '@/types'

const STATUS_STYLES: Record<WorkDayStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  planned:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<WorkDayStatus, string> = {
  not_started: 'Not Started',
  planned:     'Planned',
  in_progress: 'In Progress',
  done:        'Done',
}
const NEXT_STATUS: Record<WorkDayStatus, WorkDayStatus> = {
  not_started: 'planned',
  planned:     'in_progress',
  in_progress: 'done',
  done:        'not_started',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface WorkDayListProps {
  jobId: string
  initialWorkDays: WorkDayWithCrew[]
  allWorkers: Worker[]
  teams: TeamWithMembers[]
  canManage?: boolean
}

export function WorkDayList({ jobId, initialWorkDays, allWorkers, teams, canManage = true }: WorkDayListProps) {
  const router = useRouter()
  const [workDays, setWorkDays] = useState<WorkDayWithCrew[]>(initialWorkDays)
  const [adding, setAdding] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [crewDay, setCrewDay] = useState<WorkDayWithCrew | null>(null)
  const [, startTransition] = useTransition()

  const scheduledDates = new Set(workDays.map((d) => d.date))

  function toggleDate(dateStr: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr)
      return next
    })
  }

  async function handleAddDays() {
    if (selectedDates.size === 0) return
    setAdding(true)
    const sorted = [...selectedDates].sort()
    const results = await Promise.all(
      sorted.map((date) =>
        fetch('/api/work-days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId, date }),
        }).then((r) => r.json())
      )
    )
    setWorkDays((prev) =>
      [...prev, ...results.map((d: any) => ({ ...d, workers: [] }))]
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setSelectedDates(new Set())
    setShowPicker(false)
    setAdding(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setWorkDays((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/work-days/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  async function handleStatusCycle(day: WorkDayWithCrew) {
    const next = NEXT_STATUS[day.status]
    setWorkDays((prev) => prev.map((d) => d.id === day.id ? { ...d, status: next } : d))
    await fetch(`/api/work-days/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    startTransition(() => router.refresh())
  }

  function handleCrewSaved(dayId: string, workers: Worker[]) {
    setWorkDays((prev) => prev.map((d) => d.id === dayId ? { ...d, workers } : d))
    setCrewDay(null)
    startTransition(() => router.refresh())
  }

  // Calendar helpers
  const { year, month } = calMonth
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <CalendarDays size={15} />
              Work Days
              {workDays.length > 0 && <span className="text-gray-400 font-normal">({workDays.length})</span>}
            </div>
            {canManage && (
              <button
                onClick={() => { setShowPicker((v) => !v); setSelectedDates(new Set()) }}
                className="flex items-center gap-1 text-xs text-teal-500 font-medium"
              >
                <Plus size={13} /> Add Days
              </button>
            )}
          </div>

          {showPicker && (
            <div className="mt-3 border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
              {/* Month nav */}
              <div className="flex items-center justify-between">
                <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                  className="p-1 text-gray-400 hover:text-gray-700">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
                <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                  className="p-1 text-gray-400 hover:text-gray-700">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 text-center">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <span key={d} className="text-[10px] font-medium text-gray-400 pb-1">{d}</span>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = toDateStr(year, month, day)
                  const isSelected = selectedDates.has(dateStr)
                  const isScheduled = scheduledDates.has(dateStr)
                  const isPast = dateStr < today
                  return (
                    <button
                      key={day}
                      onClick={() => !isScheduled && toggleDate(dateStr)}
                      disabled={isScheduled}
                      className={cn(
                        'w-full aspect-square flex items-center justify-center text-xs rounded-full font-medium transition-colors',
                        isScheduled  ? 'text-gray-300 cursor-default' :
                        isSelected   ? 'bg-teal-500 text-white' :
                        isPast       ? 'text-gray-300 hover:bg-gray-50' :
                                       'text-gray-700 hover:bg-teal-50 hover:text-teal-600'
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {selectedDates.size > 0 ? `${selectedDates.size} day${selectedDates.size > 1 ? 's' : ''} selected` : 'Tap dates to select'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setShowPicker(false); setSelectedDates(new Set()) }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                  <button
                    onClick={handleAddDays}
                    disabled={adding || selectedDates.size === 0}
                    className="text-xs bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {adding ? 'Adding…' : `Add ${selectedDates.size > 0 ? selectedDates.size : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardBody className={workDays.length === 0 && !showPicker ? 'py-6 text-center' : 'p-0'}>
          {workDays.length === 0 && !showPicker ? (
            <div>
              <p className="text-sm text-gray-400 mb-2">No work days scheduled</p>
              {canManage && (
                <button onClick={() => setShowPicker(true)} className="text-xs text-teal-500 font-medium">
                  Schedule the first day
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workDays.map((day) => (
                <li key={day.id} className="flex items-start gap-3 px-4 py-3">
                  <button
                    onClick={() => handleStatusCycle(day)}
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors mt-0.5',
                      STATUS_STYLES[day.status]
                    )}
                    title={`${STATUS_LABELS[day.status]} — tap to advance`}
                  >
                    {day.status === 'done' ? <Check size={11} /> : null}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', day.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900')}>
                      {formatDate(day.date)}
                    </p>
                    {day.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{day.notes}</p>}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {day.workers.map((w) => (
                        <span key={w.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{w.name}</span>
                      ))}
                      {canManage && (
                        <button onClick={() => setCrewDay(day)} className="flex items-center gap-0.5 text-[10px] text-teal-500 font-medium hover:text-teal-600">
                          <Users size={10} />
                          {day.workers.length === 0 ? 'Assign crew' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>

                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5', STATUS_STYLES[day.status])}>
                    {STATUS_LABELS[day.status]}
                  </span>

                  {canManage && (
                    <button onClick={() => handleDelete(day.id)} className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0 mt-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {crewDay && (
        <WorkDayCrewPicker
          workDayId={crewDay.id}
          workDayDate={formatDate(crewDay.date)}
          currentWorkers={crewDay.workers}
          allWorkers={allWorkers}
          teams={teams}
          onClose={() => setCrewDay(null)}
          onSave={(workers) => handleCrewSaved(crewDay.id, workers)}
        />
      )}
    </>
  )
}
