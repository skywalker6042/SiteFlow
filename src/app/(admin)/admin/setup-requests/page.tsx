import sql from '@/lib/db'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { ensureTable } from '@/app/api/setup-requests/route'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  new:         'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<string, string> = {
  new: 'New', in_progress: 'In Progress', completed: 'Completed',
}

export default async function AdminSetupRequestsPage() {
  await ensureTable()

  const requests = await sql`
    SELECT * FROM setup_requests ORDER BY
      CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
      created_at DESC
  `

  const counts = {
    new:         requests.filter((r: any) => r.status === 'new').length,
    in_progress: requests.filter((r: any) => r.status === 'in_progress').length,
    completed:   requests.filter((r: any) => r.status === 'completed').length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Setup Requests</h1>
          <p className="text-sm text-gray-400 mt-0.5">{requests.length} total</p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <StatPill label="New"         count={counts.new}         color="blue" />
        <StatPill label="In Progress" count={counts.in_progress} color="yellow" />
        <StatPill label="Completed"   count={counts.completed}   color="green" />
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wrench size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No setup requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Organization</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Contact</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Workers</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(requests as any[]).map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/setup-requests/${r.id}`} className="flex flex-col gap-0.5">
                      <span className="font-medium text-gray-900 hover:text-orange-500 transition-colors">{r.organization_name}</span>
                      <span className="text-xs text-gray-400">{r.email}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.contact_name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.workers_count ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
    green:  'bg-green-50  text-green-700  border-green-200',
  }
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${cls[color]}`}>
      {count} {label}
    </div>
  )
}
