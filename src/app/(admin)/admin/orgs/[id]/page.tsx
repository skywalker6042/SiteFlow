import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Crown, UserCircle } from 'lucide-react'
import { AddMemberForm } from '@/components/admin/AddMemberForm'
import { RemoveMemberButton } from '@/components/admin/RemoveMemberButton'
import { DeleteOrgButton } from '@/components/admin/DeleteOrgButton'
import { EditOrgName } from '@/components/admin/EditOrgName'
import { EditMemberEmail } from '@/components/admin/EditMemberEmail'
import { OrgPlanSelector } from '@/components/admin/OrgPlanSelector'
import { DEFAULT_PLAN_FEATURES, FEATURE_LABELS, PLAN_LABELS, type PlanTier, type FeatureKey } from '@/lib/plan-features'
import { getAdminCaps } from '@/lib/admin-caps'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function OrgDetailPage({ params }: PageProps) {
  const { id } = await params
  const { can } = await getAdminCaps()

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'`

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

  // Load plan features to show what this org's plan includes
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'plan_features_%'`
  const planFeatures: Record<PlanTier, FeatureKey[]> = {
    trial: DEFAULT_PLAN_FEATURES.trial,
    core:  DEFAULT_PLAN_FEATURES.core,
    pro:   DEFAULT_PLAN_FEATURES.pro,
  }
  for (const row of rows as any[]) {
    const tier = (row.key as string).replace('plan_features_', '') as PlanTier
    if (tier in planFeatures) {
      try { planFeatures[tier] = JSON.parse(row.value) } catch {}
    }
  }

  const orgPlan: PlanTier = (org.plan as PlanTier) ?? 'trial'
  const enabledFeatures = planFeatures[orgPlan]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            {can('edit_org_details')
              ? <EditOrgName orgId={org.id} initialName={org.name} />
              : <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
            }
            {org.slug && <p className="text-sm text-gray-400">{org.slug}</p>}
          </div>
        </div>
        {can('delete_orgs') && <DeleteOrgButton orgId={org.id} orgName={org.name} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Members" value={String(members.length)} />
        <StatCard label="Status"  value={org.status ?? 'trial'} />
        <StatCard label="Org ID"  value={org.id.slice(0, 8) + '…'} mono />
      </div>

      {/* Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Controls which features this org can access.</p>
          </div>
          {can('manage_org_plan') && <OrgPlanSelector orgId={org.id} currentPlan={orgPlan} />}
        </div>

        {/* Feature breakdown for current plan */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {PLAN_LABELS[orgPlan]} Plan — Enabled Features
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map(key => {
              const on = enabledFeatures.includes(key)
              return (
                <span
                  key={key}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    on ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400 line-through'
                  }`}
                >
                  {FEATURE_LABELS[key]}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Members</h2>
          {can('manage_org_members') && <AddMemberForm orgId={id} />}
        </div>

        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No members yet.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {members.map((m) => (
              <li key={m.member_id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {m.role === 'owner' ? (
                    <Crown size={15} className="text-teal-400 shrink-0" />
                  ) : (
                    <UserCircle size={15} className="text-gray-400 shrink-0" />
                  )}
                  <div>
                    {can('manage_org_members')
                      ? <EditMemberEmail orgId={id} userId={m.user_id} initialEmail={m.email} />
                      : <p className="text-sm font-medium text-gray-800">{m.email}</p>
                    }
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                </div>
                {can('manage_org_members') && <RemoveMemberButton orgId={id} userId={m.user_id} />}
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
      <p className={`text-lg font-bold text-gray-900 mt-1 capitalize ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
