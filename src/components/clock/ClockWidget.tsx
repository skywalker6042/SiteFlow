'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, LogIn, LogOut, Briefcase } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'

interface OpenEntry { id: string; clock_in: string; job_name: string | null }
interface LogEntry  { id: string; clock_in: string; clock_out: string | null; job_name: string | null }
interface Job       { id: string; name: string }

interface Props {
  initialOpen:  OpenEntry | null
  myLogs:       LogEntry[]
  jobs:         Job[]
  trackJob:     boolean
}

function formatDuration(from: string, to?: string) {
  const start = new Date(from)
  const end   = to ? new Date(to) : new Date()
  const mins  = Math.floor((end.getTime() - start.getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ClockWidget({ initialOpen, myLogs: initialLogs, jobs, trackJob }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState<OpenEntry | null>(initialOpen)
  const [logs, setLogs]       = useState<LogEntry[]>(initialLogs)
  const [elapsed, setElapsed] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<string>('')

  useEffect(() => {
    if (!open) return
    const tick = () => setElapsed(formatDuration(open.clock_in))
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [open])

  async function clockIn() {
    setLoading(true)
    const res = await fetch('/api/worker/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: selectedJob || undefined }),
    })
    if (res.ok) {
      const entry = await res.json()
      setOpen({ id: entry.id, clock_in: entry.clock_in, job_name: entry.job_name })
      setLogs(l => [{ ...entry, clock_out: null }, ...l])
      router.refresh()
    }
    setLoading(false)
  }

  async function clockOut() {
    setLoading(true)
    const res = await fetch('/api/worker/time', { method: 'PATCH' })
    if (res.ok) {
      const entry = await res.json()
      setOpen(null)
      setLogs(l => l.map(log => log.id === entry.id ? { ...log, clock_out: entry.clock_out } : log))
      router.refresh()
    }
    setLoading(false)
  }

  const totalMins = logs
    .filter(l => l.clock_out)
    .reduce((sum, l) => sum + Math.floor((new Date(l.clock_out!).getTime() - new Date(l.clock_in).getTime()) / 60000), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Main clock card */}
      <Card>
        <CardBody className="flex flex-col items-center gap-5 py-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${open ? 'bg-green-500' : 'bg-gray-200'}`}>
            <Clock size={36} className={open ? 'text-white' : 'text-gray-400'} />
          </div>

          {open ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{elapsed || '…'}</p>
              <p className="text-sm text-gray-500 mt-1">
                Clocked in at {formatTime(open.clock_in)}
                {open.job_name && <span className="text-teal-500"> · {open.job_name}</span>}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">Not clocked in</p>
              {totalMins > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {Math.floor(totalMins / 60)}h {totalMins % 60}m logged today
                </p>
              )}
            </div>
          )}

          {/* Job selector (clock-in only) */}
          {!open && trackJob && jobs.length > 0 && (
            <div className="w-full max-w-xs">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <Briefcase size={14} className="text-gray-400 shrink-0" />
                <select
                  value={selectedJob}
                  onChange={e => setSelectedJob(e.target.value)}
                  className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none"
                >
                  <option value="">Select Job</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {open ? (
            <button
              onClick={clockOut}
              disabled={loading}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-2xl text-sm transition-colors disabled:opacity-50"
            >
              <LogOut size={16} /> Clock Out
            </button>
          ) : (
            <button
              onClick={clockIn}
              disabled={loading}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-2xl text-sm transition-colors disabled:opacity-50"
            >
              <LogIn size={16} /> Clock In
            </button>
          )}
        </CardBody>
      </Card>

      {/* Today's log */}
      {logs.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-1 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Today</p>
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">
                    {formatTime(log.clock_in)}
                    {log.clock_out && ` – ${formatTime(log.clock_out)}`}
                    {!log.clock_out && <span className="text-green-600 font-medium ml-1">Active</span>}
                  </p>
                  {log.job_name && <p className="text-xs text-gray-400">{log.job_name}</p>}
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {formatDuration(log.clock_in, log.clock_out ?? undefined)}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
