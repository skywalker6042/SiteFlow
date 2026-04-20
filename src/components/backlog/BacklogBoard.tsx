'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { JobCard } from '@/components/jobs/JobCard'
import type { Job } from '@/types'

type SortKey = 'total_value' | 'outstanding' | 'percent_complete' | 'planned_start' | 'created_at'
type SortDir = 'asc' | 'desc'

interface BacklogJob extends Job {
  task_count: number
  done_task_count: number
  phase_count: number
  done_phase_count: number
}

export function BacklogBoard({ jobs }: { jobs: BacklogJob[] }) {
  const [sortKey, setSortKey]         = useState<SortKey>('created_at')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')
  const [filterBalance, setFilterBalance] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    let list = [...jobs]
    if (filterBalance) list = list.filter((j) => Number(j.total_value) - Number(j.amount_paid) > 0)

    list.sort((a, b) => {
      let av: number | string, bv: number | string
      switch (sortKey) {
        case 'total_value':       av = Number(a.total_value);  bv = Number(b.total_value);  break
        case 'outstanding':       av = Number(a.total_value) - Number(a.amount_paid); bv = Number(b.total_value) - Number(b.amount_paid); break
        case 'percent_complete':  av = Number(a.percent_complete); bv = Number(b.percent_complete); break
        case 'planned_start':     av = a.planned_start ?? '9999'; bv = b.planned_start ?? '9999'; break
        default:                  av = a.created_at; bv = b.created_at
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return list
  }, [jobs, sortKey, sortDir, filterBalance])

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={11} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp size={11} className="text-teal-500" />
      : <ArrowDown size={11} className="text-teal-500" />
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button
        onClick={() => handleSort(k)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 whitespace-nowrap"
      >
        {label} <SortIcon k={k} />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sort</span>
        <SortBtn k="created_at"       label="Date Added"  />
        <SortBtn k="total_value"      label="Value"       />
        <SortBtn k="outstanding"      label="Outstanding" />
        <SortBtn k="percent_complete" label="Progress"    />
        <SortBtn k="planned_start"    label="Start Date"  />

        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={filterBalance}
            onChange={(e) => setFilterBalance(e.target.checked)}
            className="accent-teal-500"
          />
          Has balance
        </label>
      </div>

      <p className="text-xs text-gray-400 px-1">{sorted.length} job{sorted.length !== 1 ? 's' : ''}</p>

      {sorted.length === 0 ? (
        <Card><CardBody className="py-10 text-center"><p className="text-sm text-gray-400">No jobs in backlog</p></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((job) => (
            <JobCard key={job.id} job={job as any} showFinancials canEdit />
          ))}
        </div>
      )}
    </div>
  )
}
