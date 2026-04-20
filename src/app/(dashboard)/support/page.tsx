import { auth } from '@/lib/auth'
import { getOrgId } from '@/lib/auth-context'
import sql from '@/lib/db'
import { TicketForm } from '@/components/support/TicketForm'
import { MessageCircle, Clock, CheckCircle2, CircleDot, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string>   = { bug: 'Bug', feature: 'Feature Request', general: 'Question' }
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
}

export default async function SupportPage() {
  const session = await auth()
  const orgId   = await getOrgId()

  // Ensure tables exist
  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id     UUID,
      user_id    TEXT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      org_name   TEXT,
      type       TEXT NOT NULL DEFAULT 'general',
      subject    TEXT NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      priority   TEXT NOT NULL DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender     TEXT NOT NULL DEFAULT 'user',
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const user = session?.user as any

  // Fetch org name for pre-fill
  let orgName = ''
  if (orgId) {
    const [org] = await sql`SELECT name FROM organizations WHERE id = ${orgId}`
    orgName = org?.name ?? ''
  }

  // Fetch recent tickets from this user
  const recentTickets = user?.id
    ? await sql`
        SELECT id, subject, type, status, priority, created_at
        FROM support_tickets
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 8
      `
    : []

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500 mt-0.5">Get help or send us feedback — we read every message.</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MessageCircle size={16} className="text-teal-400" />
          Submit a Request
        </h2>
        <TicketForm
          initialName={user?.name ?? ''}
          initialEmail={user?.email ?? ''}
          initialOrg={orgName}
        />
      </div>

      {/* Recent tickets */}
      {recentTickets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-gray-400" />
            Your Recent Requests
          </h2>
          <div className="flex flex-col divide-y divide-gray-50">
            {(recentTickets as any[]).map(t => (
              <div key={t.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400">
                    {TYPE_LABELS[t.type] ?? t.type} · {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
