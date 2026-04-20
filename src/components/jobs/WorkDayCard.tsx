'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { ChevronDown, Loader } from 'lucide-react'

type WDStatus = 'not_started' | 'planned' | 'in_progress' | 'done'

const STATUS_LABELS: Record<WDStatus, string> = {
  not_started: 'Not Started',
  planned:     'Planned',
  in_progress: 'In Progress',
  done:        'Done',
}
const STATUS_STYLES: Record<WDStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  planned:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-green-100 text-green-700',
}
const ALL: WDStatus[] = ['not_started', 'planned', 'in_progress', 'done']

interface WorkDayCardProps {
  id: string
  jobId: string
  jobName: string
  dateLabel: string
  crew: string[]
  initialStatus: WDStatus
}

export function WorkDayCard({ id, jobId, jobName, dateLabel, crew, initialStatus }: WorkDayCardProps) {
  const router = useRouter()
  const [status, setStatus]   = useState<WDStatus>(initialStatus)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function changeStatus(next: WDStatus, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (next === status) { setMenuOpen(false); return }
    setMenuOpen(false)
    setLoading(true)
    const res = await fetch(`/api/work-days/${id}`, {
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

  function toggleMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(v => !v)
  }

  return (
    <div onClick={() => router.push(`/jobs/${jobId}`)} className="cursor-pointer">
      <Card className="hover:border-teal-300 transition-all">
        <CardBody className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{jobName}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {crew.length > 0 ? crew.join(', ') : 'No crew assigned'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-xs font-semibold text-teal-500">{dateLabel}</p>
            <div className="relative">
              <button
                onClick={toggleMenu}
                disabled={loading}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border border-transparent transition-colors disabled:opacity-50 ${STATUS_STYLES[status]}`}
              >
                {loading ? <Loader size={10} className="animate-spin" /> : STATUS_LABELS[status]}
                {!loading && <ChevronDown size={10} />}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32">
                    {ALL.map(s => (
                      <button
                        key={s}
                        onClick={e => changeStatus(s, e)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          s === status ? 'font-semibold bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
