'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkDayWithJob } from '@/types'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const PALETTE = [
  'bg-blue-100   text-blue-800   border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-teal-100   text-teal-800   border-teal-200',
  'bg-rose-100   text-rose-800   border-rose-200',
  'bg-amber-100  text-amber-800  border-amber-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-orange-100 text-orange-800 border-orange-200',
]

function jobColor(jobId: string): string {
  let h = 0
  for (let i = 0; i < jobId.length; i++) h = jobId.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

interface CalendarGridProps {
  initialSessions: WorkDayWithJob[]
  initialYear: number
  initialMonth: number
}

export function CalendarGrid({ initialSessions, initialYear, initialMonth }: CalendarGridProps) {
  const router = useRouter()
  const [year, setYear]       = useState(initialYear)
  const [month, setMonth]     = useState(initialMonth)
  const [sessions, setSessions] = useState<WorkDayWithJob[]>(initialSessions)
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterJob, setFilterJob]       = useState<string>('')
  const [filterCrew, setFilterCrew]     = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Detail popover
  const [detailDay, setDetailDay] = useState<WorkDayWithJob | null>(null)

  const fetchSessions = useCallback(async (y: number, m: number) => {
    setLoading(true)
    const res = await fetch(`/api/work-days?year=${y}&month=${m}`)
    setSessions(await res.json())
    setLoading(false)
  }, [])

  function prevMonth() {
    const nm = month === 1 ? 12 : month - 1
    const ny = month === 1 ? year - 1 : year
    setMonth(nm); setYear(ny)
    fetchSessions(ny, nm)
  }
  function nextMonth() {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    setMonth(nm); setYear(ny)
    fetchSessions(ny, nm)
  }

  // Derive unique jobs + workers for filter dropdowns
  const allJobs = useMemo(() => {
    const seen = new Map<string, string>()
    sessions.forEach((s) => seen.set(s.job_id, s.job_name))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  const allWorkers = useMemo(() => {
    const seen = new Map<string, string>()
    sessions.forEach((s) => s.workers?.forEach((w) => seen.set(w.id, w.name)))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  // Apply filters
  const filtered = useMemo(() => sessions.filter((s) => {
    if (filterJob    && s.job_id !== filterJob) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (filterCrew   && !s.workers?.some((w) => w.id === filterCrew)) return false
    return true
  }), [sessions, filterJob, filterStatus, filterCrew])

  const byDate = useMemo(() => filtered.reduce<Record<string, WorkDayWithJob[]>>((acc, s) => {
    const key = s.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {}), [filtered])

  // Calendar grid
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth  = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
  const dayKey = (d: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const hasFilter = filterJob || filterCrew || filterStatus

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">{MONTHS[month - 1]} {year}</h2>
          {loading && <Loader size={14} className="animate-spin text-gray-400" />}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="">All Jobs</option>
          {allJobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>

        <select
          value={filterCrew}
          onChange={(e) => setFilterCrew(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="">All Crew</option>
          {allWorkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        {hasFilter && (
          <button
            onClick={() => { setFilterJob(''); setFilterCrew(''); setFilterStatus('') }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="bg-gray-50 min-h-[80px] sm:min-h-[100px]" />
          const key = dayKey(day)
          const daySessions = byDate[key] ?? []

          return (
            <div
              key={day}
              className={cn(
                'bg-white min-h-[80px] sm:min-h-[100px] p-1 flex flex-col gap-0.5',
                isToday(day) && 'bg-orange-50'
              )}
            >
              <span className={cn(
                'text-xs font-semibold self-start w-5 h-5 flex items-center justify-center rounded-full mb-0.5',
                isToday(day) ? 'bg-orange-500 text-white' : 'text-gray-500'
              )}>
                {day}
              </span>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {daySessions.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setDetailDay(detailDay?.id === s.id ? null : s)}
                    className={cn(
                      'text-left text-[10px] sm:text-xs font-medium px-1 py-0.5 rounded border truncate w-full leading-tight',
                      jobColor(s.job_id),
                      s.status === 'done' && 'opacity-50 line-through'
                    )}
                    title={`${s.job_name} — ${s.workers?.map((w) => w.name).join(', ') || 'No crew'}`}
                  >
                    <span className="hidden sm:inline">{s.job_name}</span>
                    <span className="sm:hidden">{s.job_name.slice(0, 5)}</span>
                    {s.workers && s.workers.length > 0 && (
                      <span className="hidden sm:inline text-[9px] opacity-70 ml-1">
                        · {s.workers.length}
                      </span>
                    )}
                  </button>
                ))}
                {daySessions.length > 3 && (
                  <span className="text-[10px] text-gray-400 px-1">+{daySessions.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail popover */}
      {detailDay && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">{detailDay.job_name}</p>
              <p className="text-xs text-gray-400">{detailDay.date.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                detailDay.status === 'done' ? 'bg-green-100 text-green-700' :
                detailDay.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              )}>
                {detailDay.status === 'in_progress' ? 'In Progress' : detailDay.status === 'done' ? 'Done' : 'Planned'}
              </span>
              <button onClick={() => setDetailDay(null)} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            </div>
          </div>

          {detailDay.notes && (
            <p className="text-xs text-gray-500 mb-2">{detailDay.notes}</p>
          )}

          {detailDay.workers && detailDay.workers.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {detailDay.workers.map((w) => (
                <span key={w.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                  {w.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No crew assigned</p>
          )}

          <button
            onClick={() => router.push(`/jobs/${detailDay.job_id}`)}
            className="mt-3 text-xs text-orange-500 font-medium hover:text-orange-600"
          >
            View job →
          </button>
        </div>
      )}

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
          <span className="font-medium">{filtered.length} day{filtered.length !== 1 ? 's' : ''}</span>
          <span>{new Set(filtered.map((s) => s.job_id)).size} job{new Set(filtered.map((s) => s.job_id)).size !== 1 ? 's' : ''}</span>
          {filtered.filter((s) => s.status === 'done').length > 0 && (
            <span className="text-green-600">{filtered.filter((s) => s.status === 'done').length} done</span>
          )}
        </div>
      )}
    </div>
  )
}
