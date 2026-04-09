import sql from '@/lib/db'
import Link from 'next/link'
import { Ticket } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps { searchParams: Promise<{ type?: string; status?: string }> }

const TYPE_COLORS: Record<string, string> = {
  bug:     'bg-red-100 text-red-700',
  feature: 'bg-purple-100 text-purple-700',
  general: 'bg-blue-100 text-blue-700',
}
const TYPE_LABELS: Record<string, string> = { bug: 'Bug', feature: 'Feature', general: 'Question' }

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved:    'bg-green-50 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<string, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400', medium: 'text-blue-500', high: 'text-red-500',
}

export default async function AdminTicketsPage({ searchParams }: PageProps) {
  const { type, status } = await searchParams

  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID, user_id TEXT, name TEXT NOT NULL, email TEXT NOT NULL,
      org_name TEXT, type TEXT NOT NULL DEFAULT 'general', subject TEXT NOT NULL,
      message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender TEXT NOT NULL DEFAULT 'user', message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const tickets = await (
    type && status ? sql`SELECT * FROM support_tickets WHERE type = ${type} AND status = ${status} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC` :
    type           ? sql`SELECT * FROM support_tickets WHERE type = ${type} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC` :
    status         ? sql`SELECT * FROM support_tickets WHERE status = ${status} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC` :
                     sql`SELECT * FROM support_tickets ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC`
  )

  const counts = {
    open:        tickets.filter((t: any) => t.status === 'open').length,
    in_progress: tickets.filter((t: any) => t.status === 'in_progress').length,
    feature:     tickets.filter((t: any) => t.type === 'feature').length,
    high:        tickets.filter((t: any) => t.priority === 'high').length,
  }

  const filterLink = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    if (params.type)   q.set('type', params.type)
    if (params.status) q.set('status', params.status)
    return `/admin/tickets${q.size ? `?${q}` : ''}`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tickets.length} total</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Organizations
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <StatPill label="Open"          count={counts.open}        color="blue" />
        <StatPill label="In Progress"   count={counts.in_progress} color="yellow" />
        <StatPill label="Feature Reqs"  count={counts.feature}     color="purple" />
        <StatPill label="High Priority" count={counts.high}        color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={filterLink({})} className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${!type && !status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>All</Link>
        {(['open','in_progress','resolved','closed'] as const).map(s => (
          <Link key={s} href={filterLink({ status: s, type })}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {(['bug','feature','general'] as const).map(t => (
          <Link key={t} href={filterLink({ type: t, status })}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${type === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
            {TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {/* Table */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Ticket size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No tickets yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Subject</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Org</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(tickets as any[]).map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${t.id}`} className="flex flex-col gap-0.5">
                      <span className="font-medium text-gray-900 hover:text-orange-500 transition-colors">{t.subject}</span>
                      <span className="text-xs text-gray-400">{t.name} · {t.email}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{t.org_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[t.type] ?? 'bg-gray-100 text-gray-500'}`}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  const cls: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-700   border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red:    'bg-red-50    text-red-700    border-red-200',
  }
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${cls[color]}`}>
      {count} {label}
    </div>
  )
}
