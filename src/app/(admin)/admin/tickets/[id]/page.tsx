import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TicketStatusActions } from '@/components/admin/TicketStatusActions'
import { TicketReplyForm } from '@/components/admin/TicketReplyForm'
import { ArrowLeft, User, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

const TYPE_COLORS: Record<string, string>   = { bug: 'bg-red-100 text-red-700', feature: 'bg-purple-100 text-purple-700', general: 'bg-blue-100 text-blue-700' }
const TYPE_LABELS: Record<string, string>   = { bug: 'Bug', feature: 'Feature Request', general: 'General Question' }

export default async function AdminTicketDetailPage({ params }: PageProps) {
  const { id } = await params

  const [ticket] = await sql`SELECT * FROM support_tickets WHERE id = ${id}`
  if (!ticket) notFound()

  const replies = await sql`
    SELECT * FROM ticket_replies WHERE ticket_id = ${id} ORDER BY created_at ASC
  `

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back */}
      <Link href="/admin/tickets" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Tickets
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Ticket header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-base font-bold text-gray-900 leading-snug">{String(ticket.subject)}</h1>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[String(ticket.type)] ?? 'bg-gray-100 text-gray-500'}`}>
                {TYPE_LABELS[String(ticket.type)] ?? String(ticket.type)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
              <span className="flex items-center gap-1"><User size={11} /> {String(ticket.name)}</span>
              {ticket.org_name && <span className="flex items-center gap-1"><Building2 size={11} /> {String(ticket.org_name)}</span>}
              <span>{new Date(String(ticket.created_at)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {String(ticket.message)}
            </div>
          </div>

          {/* Thread */}
          {(replies as any[]).length > 0 && (
            <div className="flex flex-col gap-3">
              {(replies as any[]).map(r => (
                <div key={r.id} className={`rounded-xl border p-4 ${r.sender === 'admin' ? 'bg-teal-50 border-teal-100 ml-6' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${r.sender === 'admin' ? 'text-teal-600' : 'text-gray-500'}`}>
                      {r.sender === 'admin' ? 'SiteFlo Support' : ticket.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{r.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Reply</p>
            <TicketReplyForm ticketId={id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <TicketStatusActions
              ticketId={id}
              status={String(ticket.status)}
              priority={String(ticket.priority)}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 text-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitter</p>
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-gray-900">{String(ticket.name)}</p>
              <p className="text-gray-500">{String(ticket.email)}</p>
              {ticket.org_name && <p className="text-gray-400 text-xs">{String(ticket.org_name)}</p>}
            </div>
            <div className="border-t border-gray-100 pt-3 text-xs text-gray-400 flex flex-col gap-1">
              <span>Submitted {new Date(String(ticket.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>Updated {new Date(String(ticket.updated_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
