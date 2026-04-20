import sql from '@/lib/db'
import { Building2 } from 'lucide-react'
import { NewOrgForm } from '@/components/admin/NewOrgForm'
import { OrgTable } from '@/components/admin/OrgTable'
import { getAdminCaps } from '@/lib/admin-caps'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { can } = await getAdminCaps()

  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS billing_status  TEXT NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_until      TIMESTAMPTZ
  `
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'`

  const orgs = await sql`
    SELECT
      o.id, o.name, o.slug, o.created_at,
      o.status, o.billing_status, o.paid_until, o.trial_ends_at, o.plan,
      COUNT(DISTINCT om.id) FILTER (WHERE om.id IS NOT NULL) AS member_count,
      COUNT(DISTINCT j.id)  FILTER (WHERE j.id  IS NOT NULL) AS job_count,
      MAX(al.created_at) AS last_activity
    FROM organizations o
    LEFT JOIN org_members om ON om.org_id = o.id
    LEFT JOIN jobs j         ON j.company_id = o.id
    LEFT JOIN activity_logs al ON al.company_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `

  const counts = {
    total:     orgs.length,
    active:    orgs.filter((o) => o.status === 'active').length,
    trial:     orgs.filter((o) => o.status === 'trial').length,
    suspended: orgs.filter((o) => o.status === 'suspended').length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{counts.total} total</p>
        </div>
        {can('create_orgs') && <NewOrgForm />}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Pill label="Active"    count={counts.active}    color="green" />
        <Pill label="Trial"     count={counts.trial}     color="yellow" />
        <Pill label="Suspended" count={counts.suspended} color="red" />
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No organizations yet.</p>
        </div>
      ) : (
        <OrgTable
          orgs={orgs as any}
          canManageStatus={can('manage_org_status')}
          canManagePlan={can('manage_org_plan')}
          canManageBilling={can('manage_org_billing')}
        />
      )}
    </div>
  )
}

function Pill({ label, count, color }: { label: string; count: number; color: 'green' | 'yellow' | 'red' }) {
  const cls = {
    green:  'bg-green-50  text-green-700  border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red:    'bg-red-50    text-red-700    border-red-200',
  }[color]
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
      {count} {label}
    </div>
  )
}
