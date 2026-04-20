'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Database, Server, HardDrive, Image, RefreshCw, Ticket, Building2, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface HealthData {
  timestamp: string
  app: {
    status:      string
    uptime:      number
    nodeVersion: string
    env:         string
    memoryUsed:  number
  }
  database: {
    status:     string
    responseMs: number
    counts: {
      orgs:        number
      users:       number
      jobs:        number
      doneJobs:    number
      photos:      number
      tickets:     number
      openTickets: number
    }
  }
  system: {
    platform:    string
    cpuCores:    number
    loadAvg1:    number
    loadAvg5:    number
    loadAvg15:   number
    totalMemory: number
    usedMemory:  number
    freeMemory:  number
    disk: { total: number; used: number; free: number } | null
  }
  storage: { fileCount: number; totalBytes: number }
  recentActivity: { actor_email: string; entity_type: string; entity_name: string; action: string; created_at: string }[]
}

function fmt(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
}

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function Bar({ pct, color = 'bg-teal-500' }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const barColor = clamped > 85 ? 'bg-red-500' : clamped > 65 ? 'bg-yellow-400' : color
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {ok ? 'Healthy' : 'Error'}
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>{children}</div>
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-teal-600" />
      <h2 className="font-semibold text-gray-900 text-sm">{label}</h2>
    </div>
  )
}

export default function HealthPage() {
  const [data, setData]       = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health')
      if (res.ok) {
        setData(await res.json())
        setLastFetch(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, 30_000) // auto-refresh every 30s
    return () => clearInterval(id)
  }, [fetch_])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm gap-2">
        <RefreshCw size={16} className="animate-spin" /> Loading health data…
      </div>
    )
  }

  if (!data) {
    return <div className="text-red-500 text-sm">Failed to load health data.</div>
  }

  const memPct  = (data.system.usedMemory  / data.system.totalMemory) * 100
  const diskPct = data.system.disk ? (data.system.disk.used / data.system.disk.total) * 100 : 0
  const loadPct = (data.system.loadAvg1 / data.system.cpuCores) * 100
  const dbOk    = data.database.status === 'ok'
  const appOk   = data.app.status === 'ok'

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Health</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastFetch ? `Last updated ${lastFetch.toLocaleTimeString()} · auto-refreshes every 30s` : ''}
          </p>
        </div>
        <button
          onClick={fetch_}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Top status bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="flex items-center gap-3">
          <Activity size={20} className="text-teal-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Application</p>
            <StatusDot ok={appOk} />
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Database size={20} className="text-teal-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Database</p>
            <StatusDot ok={dbOk} />
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Clock size={20} className="text-teal-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Uptime</p>
            <p className="text-sm font-bold text-gray-900">{fmtUptime(data.app.uptime)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Database size={20} className="text-teal-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">DB Response</p>
            <p className="text-sm font-bold text-gray-900">{data.database.responseMs}ms</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* System Resources */}
        <Card>
          <SectionTitle icon={Server} label="Server Resources" />
          <div className="flex flex-col gap-4">

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span>CPU Load (1m avg)</span>
                <span className="font-medium text-gray-900">{data.system.loadAvg1.toFixed(2)} / {data.system.cpuCores} cores</span>
              </div>
              <Bar pct={loadPct} />
              <p className="text-xs text-gray-400 mt-1">
                5m: {data.system.loadAvg5.toFixed(2)} &nbsp;·&nbsp; 15m: {data.system.loadAvg15.toFixed(2)}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span>Memory</span>
                <span className="font-medium text-gray-900">{fmt(data.system.usedMemory)} / {fmt(data.system.totalMemory)}</span>
              </div>
              <Bar pct={memPct} />
              <p className="text-xs text-gray-400 mt-1">{fmt(data.system.freeMemory)} free</p>
            </div>

            {data.system.disk && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>Disk</span>
                  <span className="font-medium text-gray-900">{fmt(data.system.disk.used)} / {fmt(data.system.disk.total)}</span>
                </div>
                <Bar pct={diskPct} />
                <p className="text-xs text-gray-400 mt-1">{fmt(data.system.disk.free)} free</p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
              <span>Node {data.app.nodeVersion}</span>
              <span>{data.system.platform}</span>
              <span>{data.app.env}</span>
              <span>Process: {fmt(data.app.memoryUsed)}</span>
            </div>
          </div>
        </Card>

        {/* App Stats */}
        <Card>
          <SectionTitle icon={Building2} label="Application Data" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Building2, label: 'Organizations',  value: data.database.counts.orgs },
              { icon: Users,     label: 'Users',          value: data.database.counts.users },
              { icon: Activity,  label: 'Total Jobs',     value: data.database.counts.jobs },
              { icon: CheckCircle, label: 'Completed Jobs', value: data.database.counts.doneJobs },
              { icon: Image,     label: 'Photos Stored',  value: data.database.counts.photos },
              { icon: Ticket,    label: 'Open Tickets',   value: data.database.counts.openTickets },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Icon size={11} />
                  {label}
                </div>
                <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Photo Storage */}
        <Card>
          <SectionTitle icon={HardDrive} label="Photo Storage" />
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Files on disk</p>
              <p className="text-2xl font-bold text-gray-900">{data.storage.fileCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Total size</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.storage.totalBytes)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Stored in <code className="bg-gray-100 px-1 rounded">public/uploads/</code> — photos auto-delete 30 days after job completion.</p>
        </Card>

        {/* Recent Activity */}
        <Card>
          <SectionTitle icon={Activity} label="Recent Activity" />
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900 font-medium">{a.action.replace(/_/g, ' ')}</span>
                    {a.entity_name && <span className="text-gray-500"> · {a.entity_name}</span>}
                    <span className="text-gray-400"> · {a.actor_email}</span>
                  </div>
                  <span className="text-gray-300 shrink-0">{new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
