'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader } from 'lucide-react'

type JobStatus = 'not_started' | 'planned' | 'in_progress' | 'done'

const LABELS: Record<JobStatus, string> = {
  not_started: 'Not Started',
  planned:     'Planned',
  in_progress: 'In Progress',
  done:        'Done',
}

const COLORS: Record<JobStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  planned:     'bg-purple-100 text-purple-700 border-purple-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  done:        'bg-green-100 text-green-700 border-green-200',
}

const ALL: JobStatus[] = ['not_started', 'planned', 'in_progress', 'done']

export function StatusChanger({ jobId, initialStatus }: { jobId: string; initialStatus: JobStatus }) {
  const router = useRouter()
  const [status, setStatus]   = useState<JobStatus>(initialStatus)
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function change(next: JobStatus) {
    if (next === status) { setOpen(false); return }
    setOpen(false)
    setLoading(true)
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      setStatus(next)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${COLORS[status]}`}
      >
        {loading ? <Loader size={11} className="animate-spin" /> : LABELS[status]}
        {!loading && <ChevronDown size={11} />}
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36"
        >
          {ALL.map(s => (
            <button
              key={s}
              onClick={() => change(s)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                s === status ? 'font-semibold bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
