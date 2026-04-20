import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Building2, Phone, Users } from 'lucide-react'
import { SetupStatusActions } from '@/components/admin/SetupStatusActions'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function AdminSetupRequestDetailPage({ params }: PageProps) {
  const { id } = await params

  const [req] = await sql`SELECT * FROM setup_requests WHERE id = ${id}`
  if (!req) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href="/admin/setup-requests" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Setup Requests
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h1 className="text-base font-bold text-gray-900 mb-1">{String(req.organization_name)}</h1>
            <p className="text-xs text-gray-400 mb-5">
              Submitted {new Date(String(req.created_at)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <InfoRow icon={User}     label="Contact"  value={String(req.contact_name)} />
              <InfoRow icon={Building2} label="Org"     value={String(req.organization_name)} />
              <InfoRow icon={Phone}    label="Phone"    value={req.phone ? String(req.phone) : '—'} />
              <InfoRow icon={Users}    label="Workers"  value={req.workers_count ? String(req.workers_count) : '—'} />
            </div>

            {req.project_details && (
              <Section title="Current / Upcoming Projects">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{String(req.project_details)}</p>
              </Section>
            )}

            {req.notes && (
              <Section title="Additional Notes">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{String(req.notes)}</p>
              </Section>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SetupStatusActions requestId={id} status={String(req.status)} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 text-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
            <p className="font-medium text-gray-900">{String(req.contact_name)}</p>
            <a href={`mailto:${req.email}`} className="text-teal-500 hover:underline text-sm">{String(req.email)}</a>
            {req.phone && <p className="text-gray-500">{String(req.phone)}</p>}
          </div>

          <Link
            href={`/admin?prefill=${encodeURIComponent(String(req.organization_name))}`}
            className="bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg text-center transition-colors"
          >
            Create Org for This Client
          </Link>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-gray-50 rounded-lg p-4">{children}</div>
    </div>
  )
}
