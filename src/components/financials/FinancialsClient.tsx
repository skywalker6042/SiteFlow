'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, DollarSign, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatCurrency, statusLabel, statusColor } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS: Record<string, string> = {
  done: '#10b981',
  in_progress: '#f97316',
  not_started: '#94a3b8',
}

function fmt(n: number) { return formatCurrency(n) }
function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, padding: '8px 12px' },
  cursor: { fill: 'rgba(249,115,22,0.05)' },
}

interface Props {
  selectedYear: number
  minYear: number
  maxYear: number
  monthlyData: { month: number; contracted: number; billed: number; collected: number }[]
  priorData: { month: number; collected: number }[]
  kpis: {
    total_contracted: number; total_billed: number; total_paid: number
    jobs_done: number; jobs_active: number; jobs_pending: number
    revenue_done: number; revenue_active: number
  }
  pipeline: { status: string; count: number; value: number }[]
  outstandingJobs: { id: string; name: string; client_name: string | null; status: string; total_value: number; amount_billed: number; amount_paid: number }[]
  laborData: { month: number; labor_cost: number; total_hours: number }[]
  topWorkers: { name: string; role: string | null; hourly_rate: number | null; total_hours: number; total_cost: number }[]
}

export function FinancialsClient({
  selectedYear, minYear, maxYear,
  monthlyData, priorData, kpis, pipeline,
  outstandingJobs, laborData, topWorkers,
}: Props) {
  const router = useRouter()

  function setYear(y: number) {
    router.push(`/financials?year=${y}`)
  }

  // Merge monthly data for the chart
  const revenueChart = monthlyData.map((d, i) => ({
    name: MONTH_NAMES[i],
    Contracted: d.contracted,
    Billed:     d.billed,
    Collected:  d.collected,
    [`${selectedYear - 1}`]: priorData[i].collected,
  }))

  const hasLaborData  = laborData.some((d) => d.labor_cost > 0)
  const totalLaborCost  = laborData.reduce((s, d) => s + d.labor_cost, 0)
  const totalLaborHours = laborData.reduce((s, d) => s + d.total_hours, 0)
  const estimatedMargin = kpis.total_paid - totalLaborCost

  const laborChart = monthlyData.map((d, i) => ({
    name: MONTH_NAMES[i],
    Revenue:    d.collected,
    'Labor Cost': laborData[i].labor_cost,
    Hours:      laborData[i].total_hours,
  }))

  const pipelineChart = pipeline.map((p) => ({
    name: statusLabel(p.status),
    value: p.value,
    count: p.count,
    color: STATUS_COLORS[p.status] ?? '#94a3b8',
  }))

  return (
    <div className="flex flex-col gap-5">
      {/* Header + Year selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Financials</h1>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
          <button
            onClick={() => setYear(selectedYear - 1)}
            disabled={selectedYear <= minYear}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800 px-2">{selectedYear}</span>
          <button
            onClick={() => setYear(selectedYear + 1)}
            disabled={selectedYear >= maxYear}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<DollarSign size={15} className="text-gray-500" />}
          label="Contracted" value={fmtK(kpis.total_contracted)} />
        <KpiCard icon={<TrendingUp size={15} className="text-blue-500" />}
          label="Billed" value={fmtK(kpis.total_billed)}
          sub={`${fmtK(kpis.total_contracted - kpis.total_billed)} unbilled`} />
        <KpiCard icon={<CheckCircle size={15} className="text-green-500" />}
          label="Collected" value={fmtK(kpis.total_paid)} valueClass="text-green-600" />
        <KpiCard icon={<AlertCircle size={15} className="text-red-400" />}
          label="Outstanding" value={fmtK(kpis.total_contracted - kpis.total_paid)}
          valueClass={(kpis.total_contracted - kpis.total_paid) > 0 ? 'text-red-500' : 'text-green-600'}
          sub={`${kpis.jobs_active} active · ${kpis.jobs_done} done`} />
        {hasLaborData && <>
          <KpiCard icon={<Clock size={15} className="text-purple-500" />}
            label="Labor Cost" value={fmtK(totalLaborCost)} valueClass="text-purple-600"
            sub={`${totalLaborHours.toFixed(0)} hrs logged`} />
          <KpiCard icon={<TrendingUp size={15} className="text-emerald-500" />}
            label="Est. Margin" value={fmtK(estimatedMargin)}
            valueClass={estimatedMargin > 0 ? 'text-emerald-600' : 'text-red-500'}
            sub={kpis.total_paid > 0 ? `${Math.round((estimatedMargin / kpis.total_paid) * 100)}% of revenue` : undefined} />
        </>}
      </div>

      {/* Revenue chart — bars for this year + prior year line */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Revenue — {selectedYear}</span>
            <span className="text-xs text-gray-400">vs {selectedYear - 1}</span>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={((v: number, name: string) => [fmt(v), name]) as any}
                {...CHART_TOOLTIP_STYLE}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Contracted" fill="#e5e7eb" radius={[3,3,0,0]} />
              <Bar dataKey="Billed"     fill="#93c5fd" radius={[3,3,0,0]} />
              <Bar dataKey="Collected"  fill="#f97316" radius={[3,3,0,0]} />
              <Line
                type="monotone"
                dataKey={String(selectedYear - 1)}
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Labor cost vs revenue (only if data exists) */}
      {hasLaborData && (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">Labor Cost vs Revenue — {selectedYear}</span>
          </CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={laborChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={((v: number, name: string) =>
                    name === 'Hours' ? [`${v.toFixed(0)} hrs`, name] : [fmt(v), name]) as any}
                  {...CHART_TOOLTIP_STYLE}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue"    fill="#f97316" radius={[3,3,0,0]} />
                <Bar dataKey="Labor Cost" fill="#a78bfa" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Job pipeline donut + table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">Job Pipeline (All Time)</span>
          </CardHeader>
          <CardBody className="pt-0 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pipelineChart}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pipelineChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((v: number, _: string, props: any) =>
                    [`${fmt(v)} (${props.payload.count} jobs)`, props.payload.name]) as any}
                  {...CHART_TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              {pipelineChart.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-gray-600">{p.name}</span>
                    <span className="text-gray-400">({p.count})</span>
                  </div>
                  <span className="font-semibold text-gray-700">{fmtK(p.value)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Top workers */}
        {topWorkers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Top Workers — {selectedYear}</span>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="flex flex-col divide-y divide-gray-50">
                {topWorkers.slice(0, 6).map((w) => (
                  <div key={w.name} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{w.name}</p>
                      <p className="text-xs text-gray-400">{w.role ?? '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{w.total_hours.toFixed(0)} hrs</p>
                      {w.total_cost > 0 && (
                        <p className="text-[11px] text-purple-500">{fmtK(w.total_cost)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Year over year comparison line chart (only if multiple years exist) */}
      {minYear < maxYear && (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">Year Comparison — {selectedYear - 1} vs {selectedYear}</span>
          </CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as any} {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Collected" stroke="#f97316" strokeWidth={2} dot={false} name={`${selectedYear}`} />
                <Line type="monotone" dataKey={String(selectedYear - 1)} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Outstanding AR */}
      {outstandingJobs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Outstanding Balances</h2>
          <div className="flex flex-col gap-2">
            {outstandingJobs.map((job) => {
              const outstanding = job.total_value - job.amount_paid
              const pct = job.total_value > 0 ? Math.round((job.amount_paid / job.total_value) * 100) : 0
              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="hover:border-teal-300 transition-all">
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{job.name}</p>
                          {job.client_name && <p className="text-xs text-gray-400 mt-0.5">{job.client_name}</p>}
                        </div>
                        <Badge className={statusColor(job.status)}>{statusLabel(job.status)}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-gray-400">Contract</p><p className="font-semibold text-gray-700">{fmt(job.total_value)}</p></div>
                        <div><p className="text-gray-400">Billed</p><p className="font-semibold text-blue-600">{fmt(job.amount_billed)}</p></div>
                        <div><p className="text-gray-400">Collected</p><p className="font-semibold text-green-600">{fmt(job.amount_paid)}</p></div>
                      </div>
                      {/* AR progress bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{pct}% collected</span>
                          <span className="text-sm font-bold text-red-500">{fmt(outstanding)} owed</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, valueClass = 'text-gray-900', sub }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string; sub?: string
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{icon}{label}</div>
        <p className={cn('text-lg font-bold', valueClass)}>{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </CardBody>
    </Card>
  )
}
