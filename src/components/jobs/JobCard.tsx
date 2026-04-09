'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, statusLabel, statusColor } from '@/lib/utils'
import { ChevronDown, Loader } from 'lucide-react'

type JobStatus = 'not_started' | 'planned' | 'in_progress' | 'done'

const ALL_STATUSES: JobStatus[] = ['not_started', 'planned', 'in_progress', 'done']

interface JobCardProps {
  job: {
    id: string
    name: string
    client_name: string | null
    address: string | null
    status: string
    percent_complete: number
    total_value: number
    amount_paid: number
  }
  showFinancials: boolean
  canEdit: boolean
}

export function JobCard({ job, showFinancials, canEdit }: JobCardProps) {
  const router = useRouter()
  const [status, setStatus]     = useState<JobStatus>(job.status as JobStatus)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading]   = useState(false)
  const outstanding = Number(job.total_value) - Number(job.amount_paid)

  async function changeStatus(next: JobStatus, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (next === status) { setMenuOpen(false); return }
    setMenuOpen(false)
    setLoading(true)
    const res = await fetch(`/api/jobs/${job.id}`, {
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
    <div onClick={() => router.push(`/jobs/${job.id}`)} className="cursor-pointer">
      <Card className="hover:border-orange-300 transition-all">
        <CardBody className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{job.name}</p>
              {job.client_name && <p className="text-xs text-gray-400 mt-0.5">{job.client_name}</p>}
            </div>

            {/* Status badge — clickable if canEdit */}
            {canEdit ? (
              <div className="relative shrink-0">
                <button
                  onClick={toggleMenu}
                  disabled={loading}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${statusColor(status)}`}
                >
                  {loading ? <Loader size={10} className="animate-spin" /> : statusLabel(status)}
                  {!loading && <ChevronDown size={10} />}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36">
                      {ALL_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={e => changeStatus(s, e)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            s === status ? 'font-semibold bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusColor(status)}`}>
                {statusLabel(status)}
              </span>
            )}
          </div>

          <ProgressBar value={Number(job.percent_complete)} />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{job.address ?? 'No address'}</span>
            {showFinancials && outstanding > 0 && (
              <span className="font-semibold text-red-500">{formatCurrency(outstanding)} owed</span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
