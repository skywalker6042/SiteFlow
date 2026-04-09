import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Crown, UserCircle } from 'lucide-react'
import { AddMemberForm } from '@/components/admin/AddMemberForm'
import { RemoveMemberButton } from '@/components/admin/RemoveMemberButton'
import { DeleteOrgButton } from '@/components/admin/DeleteOrgButton'
import { EditOrgName } from '@/components/admin/EditOrgName'
import { EditMemberEmail } from '@/components/admin/EditMemberEmail'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function OrgDetailPage({ params }: PageProps) {
  const { id } = await params

  const [org] = await sql`SELECT * FROM organizations WHERE id = ${id}`
  if (!org) notFound()

  const members = await sql`
    SELECT
      om.id AS member_id, om.role, om.created_at,
      u.id AS user_id, u.email, u.platform_role
    FROM org_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.org_id = ${id}
    ORDER BY om.role DESC, u.email ASC
  `

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <EditOrgName orgId={org.id} initialName={org.name} />
            {org.slug && <p className="text-sm text-gray-400">{org.slug}</p>}
          </div>
        </div>
        <DeleteOrgButton orgId={org.id} orgName={org.name} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Members" value={String(members.length)} />
        <StatCard label="Owners" value={String(members.filter((m) => m.role === 'owner').length)} />
        <StatCard label="Org ID" value={org.id.slice(0, 8) + '…'} mono />
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Members</h2>
          <AddMemberForm orgId={id} />
        </div>

        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No members yet.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {members.map((m) => (
              <li key={m.member_id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {m.role === 'owner' ? (
                    <Crown size={15} className="text-orange-400 shrink-0" />
                  ) : (
                    <UserCircle size={15} className="text-gray-400 shrink-0" />
                  )}
                  <div>
                    <EditMemberEmail orgId={id} userId={m.user_id} initialEmail={m.email} />
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                </div>
                <RemoveMemberButton orgId={id} userId={m.user_id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-lg font-bold text-gray-900 mt-1 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
