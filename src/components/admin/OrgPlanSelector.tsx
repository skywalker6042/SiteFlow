'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from 'lucide-react'
import { PLAN_LABELS, type PlanTier } from '@/lib/plan-features'

const PLAN_STYLES: Record<PlanTier, string> = {
  trial: 'bg-gray-100  text-gray-700',
  core:  'bg-teal-100  text-teal-700',
  pro:   'bg-indigo-100 text-indigo-700',
}

export function OrgPlanSelector({ orgId, currentPlan }: { orgId: string; currentPlan: PlanTier }) {
  const router  = useRouter()
  const [plan,    setPlan]    = useState<PlanTier>(currentPlan)
  const [loading, setLoading] = useState(false)

  async function changePlan(next: PlanTier) {
    if (next === plan) return
    setLoading(true)
    const res = await fetch(`/api/admin/orgs/${orgId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: next }),
    })
    if (res.ok) {
      setPlan(next)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader size={13} className="animate-spin text-gray-300" />}
      <div className="flex gap-1.5">
        {(['trial', 'core', 'pro'] as PlanTier[]).map(t => (
          <button
            key={t}
            onClick={() => changePlan(t)}
            disabled={loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              plan === t
                ? `${PLAN_STYLES[t]} border-transparent`
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-700'
            }`}
          >
            {PLAN_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  )
}
