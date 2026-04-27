'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Settings2,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatCurrency, statusLabel, statusColor, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { FinancialSettings } from '@/lib/financial-settings'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STATUS_COLORS: Record<string, string> = {
  done: '#10b981',
  in_progress: '#f97316',
  not_started: '#94a3b8',
}
const CATEGORY_COLORS = ['#14b8a6', '#f97316', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b']

function fmt(n: number) { return formatCurrency(n) }
function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
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
  financialSettings: FinancialSettings
  monthlyData: { month: number; contracted: number; billed: number; collected: number; changeOrders: number }[]
  priorData: { month: number; collected: number }[]
  kpis: {
    total_contracted: number
    total_billed: number
    total_paid: number
    jobs_done: number
    jobs_active: number
    jobs_pending: number
    revenue_done: number
    revenue_active: number
  }
  pipeline: { status: string; count: number; value: number }[]
  outstandingJobs: {
    id: string
    name: string
    client_name: string | null
    status: string
    total_value: number
    amount_billed: number
    amount_paid: number
  }[]
  laborData: { month: number; labor_cost: number; total_hours: number }[]
  receiptData: { month: number; total: number }[]
  receiptCategories: { category: string; count: number; total: number }[]
  trackedCosts: {
    labor: number
    receipts: number
    includedLabor: number
    includedReceipts: number
    totalIncluded: number
    approvedChangeOrders: number
    estimatedNet: number
  }
  topWorkers: { name: string; role: string | null; hourly_rate: number | null; total_hours: number; total_cost: number }[]
}

export function FinancialsClient({
  selectedYear,
  minYear,
  maxYear,
  financialSettings,
  monthlyData,
  priorData,
  kpis,
  pipeline,
  outstandingJobs,
  laborData,
  receiptData,
  receiptCategories,
  trackedCosts,
  topWorkers,
}: Props) {
  const router = useRouter()

  function setYear(y: number) {
    router.push(`/financials?year=${y}`)
  }

  const revenueChart = monthlyData.map((d, i) => ({
    name: MONTH_NAMES[i],
    Contracted: d.contracted,
    Billed: d.billed,
    Collected: d.collected,
    'Approved COs': d.changeOrders,
    [`${selectedYear - 1}`]: priorData[i].collected,
  }))

  const hasLaborData = laborData.some((d) => d.labor_cost > 0)
  const hasReceiptData = receiptData.some((d) => d.total > 0)
  const totalLaborHours = laborData.reduce((sum, row) => sum + row.total_hours, 0)
  const marginPercent = kpis.total_paid > 0 ? Math.round((trackedCosts.estimatedNet / kpis.total_paid) * 100) : 0
  const costChart = monthlyData.map((d, i) => ({
    name: MONTH_NAMES[i],
    Collected: d.collected,
    'Tracked Costs':
      (financialSettings.financial_include_labor ? laborData[i].labor_cost : 0) +
      (financialSettings.financial_include_receipts ? receiptData[i].total : 0),
    'Net Cash': d.collected -
      ((financialSettings.financial_include_labor ? laborData[i].labor_cost : 0) +
      (financialSettings.financial_include_receipts ? receiptData[i].total : 0)),
  }))

  const pipelineChart = pipeline.map((p) => ({
    name: statusLabel(p.status),
    value: p.value,
    count: p.count,
    color: STATUS_COLORS[p.status] ?? '#94a3b8',
  }))

  const includedRevenueSources = ['Base contract value']
  if (financialSettings.financial_include_change_orders) includedRevenueSources.push('Approved change orders')

  const includedCostSources: string[] = []
  if (financialSettings.financial_include_labor) includedCostSources.push('Labor hours')
  if (financialSettings.financial_include_receipts) includedCostSources.push('Receipts')
  if (includedCostSources.length === 0) includedCostSources.push('No tracked costs')

  const showLaborSection = financialSettings.financial_show_labor_breakdown && hasLaborData
  const showReceiptSection = financialSettings.financial_show_receipt_breakdown && hasReceiptData

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-400 mt-0.5">Built around what you choose to track.</p>
        </div>
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

      <Card className="border-teal-100 bg-gradient-to-br from-teal-50 to-white">
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Financial Rules</p>
              <p className="text-xs text-gray-500 mt-1">This page reflects the sources you turned on in Settings.</p>
            </div>
            <Link href="/settings" className="text-xs text-teal-600 font-medium inline-flex items-center gap-1">
              <Settings2 size={13} /> Edit rules
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RuleGroup label="Revenue Includes" items={includedRevenueSources} tone="teal" />
            <RuleGroup label="Tracked Costs Include" items={includedCostSources} tone="amber" />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<DollarSign size={15} className="text-gray-500" />} label="Contracted" value={fmtK(kpis.total_contracted)} />
        <KpiCard
          icon={<TrendingUp size={15} className="text-blue-500" />}
          label="Billed"
          value={fmtK(kpis.total_billed)}
          sub={`${fmtK(kpis.total_contracted - kpis.total_billed)} unbilled`}
        />
        <KpiCard
          icon={<CheckCircle size={15} className="text-green-500" />}
          label="Collected"
          value={fmtK(kpis.total_paid)}
          valueClass="text-green-600"
        />
        <KpiCard
          icon={<AlertCircle size={15} className="text-red-400" />}
          label="Outstanding"
          value={fmtK(kpis.total_contracted - kpis.total_paid)}
          valueClass={(kpis.total_contracted - kpis.total_paid) > 0 ? 'text-red-500' : 'text-green-600'}
          sub={`${kpis.jobs_active} active · ${kpis.jobs_done} done`}
        />
        <KpiCard
          icon={<Receipt size={15} className="text-amber-500" />}
          label="Tracked Costs"
          value={fmtK(trackedCosts.totalIncluded)}
          valueClass={trackedCosts.totalIncluded > 0 ? 'text-amber-600' : 'text-gray-900'}
          sub={includedCostSources.join(' + ')}
        />
        <KpiCard
          icon={<TrendingUp size={15} className="text-emerald-500" />}
          label="Net Collected"
          value={fmtK(trackedCosts.estimatedNet)}
          valueClass={trackedCosts.estimatedNet >= 0 ? 'text-emerald-600' : 'text-red-500'}
          sub={kpis.total_paid > 0 ? `${marginPercent}% after tracked costs` : undefined}
        />
      </div>

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
              <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as never} {...CHART_TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Contracted" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Billed" fill="#93c5fd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Collected" fill="#f97316" radius={[3, 3, 0, 0]} />
              {financialSettings.financial_include_change_orders && (
                <Line type="monotone" dataKey="Approved COs" stroke="#14b8a6" strokeWidth={2} dot={false} />
              )}
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

      {(financialSettings.financial_include_labor || financialSettings.financial_include_receipts) && (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">Collected vs Tracked Costs — {selectedYear}</span>
          </CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as never} {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Collected" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tracked Costs" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="Net Cash" stroke="#10b981" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">Job Pipeline (All Time)</span>
          </CardHeader>
          <CardBody className="pt-0 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pipelineChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pipelineChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((v: number, _: string, props: { payload: { count: number; name: string } }) =>
                    [`${fmt(v)} (${props.payload.count} jobs)`, props.payload.name]) as never}
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

        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-700">What&apos;s Included</span>
          </CardHeader>
          <CardBody className="pt-0 flex flex-col gap-3">
            <SourceRow
              label="Approved change orders"
              amount={trackedCosts.approvedChangeOrders}
              enabled={financialSettings.financial_include_change_orders}
              tone="teal"
            />
            <SourceRow
              label="Labor"
              amount={trackedCosts.labor}
              enabled={financialSettings.financial_include_labor}
              tone="purple"
              detail={totalLaborHours > 0 ? `${totalLaborHours.toFixed(0)} hrs logged` : 'No labor hours logged'}
            />
            <SourceRow
              label="Receipts"
              amount={trackedCosts.receipts}
              enabled={financialSettings.financial_include_receipts}
              tone="amber"
              detail={hasReceiptData ? `${receiptCategories.length} active categories` : 'No receipts logged'}
            />
          </CardBody>
        </Card>
      </div>

      {showLaborSection && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardHeader>
              <span className="text-sm font-semibold text-gray-700">Labor Snapshot</span>
            </CardHeader>
            <CardBody className="pt-0 grid grid-cols-2 gap-3">
              <StatTile label="Tracked labor cost" value={fmt(trackedCosts.labor)} accent="text-purple-600" />
              <StatTile label="Hours logged" value={`${totalLaborHours.toFixed(0)} hrs`} />
            </CardBody>
          </Card>

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
                  {topWorkers.slice(0, 6).map((worker) => (
                    <div key={worker.name} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{worker.name}</p>
                        <p className="text-xs text-gray-400">{worker.role ?? '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">{worker.total_hours.toFixed(0)} hrs</p>
                        {worker.total_cost > 0 && <p className="text-[11px] text-purple-500">{fmtK(worker.total_cost)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {showReceiptSection && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <Receipt size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Receipt Summary</span>
              </div>
            </CardHeader>
            <CardBody className="pt-0 grid grid-cols-2 gap-3">
              <StatTile label="Receipt total" value={fmt(trackedCosts.receipts)} accent="text-amber-600" />
              <StatTile label="Included in costs" value={financialSettings.financial_include_receipts ? 'Yes' : 'No'} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <span className="text-sm font-semibold text-gray-700">Top Receipt Categories</span>
            </CardHeader>
            <CardBody className="pt-0 flex flex-col gap-2">
              {receiptCategories.slice(0, 6).map((category, index) => (
                <div key={category.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-gray-700 truncate">{category.category}</span>
                    <span className="text-xs text-gray-400">({category.count})</span>
                  </div>
                  <span className="font-semibold text-gray-900">{fmtK(category.total)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

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
                <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as never} {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Collected" stroke="#f97316" strokeWidth={2} dot={false} name={`${selectedYear}`} />
                <Line type="monotone" dataKey={String(selectedYear - 1)} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

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
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
  sub?: string
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

function RuleGroup({ label, items, tone }: { label: string; items: string[]; tone: 'teal' | 'amber' }) {
  const badgeClass = tone === 'teal'
    ? 'bg-teal-100 text-teal-700'
    : 'bg-amber-100 text-amber-700'

  return (
    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} className={badgeClass}>{item}</Badge>
        ))}
      </div>
    </div>
  )
}

function SourceRow({
  label,
  amount,
  enabled,
  tone,
  detail,
}: {
  label: string
  amount: number
  enabled: boolean
  tone: 'teal' | 'purple' | 'amber'
  detail?: string
}) {
  const accent = {
    teal: 'text-teal-600 bg-teal-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50',
  }[tone]

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <Badge className={enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
            {enabled ? 'Included' : 'Excluded'}
          </Badge>
        </div>
        {detail && <p className="text-xs text-gray-400 mt-1">{detail}</p>}
      </div>
      <span className={cn('text-sm font-semibold px-2.5 py-1 rounded-lg', accent)}>{fmtK(amount)}</span>
    </div>
  )
}

function StatTile({ label, value, accent = 'text-gray-900' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={cn('text-base font-bold mt-1', accent)}>{value}</p>
    </div>
  )
}
