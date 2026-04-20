'use client'

import { useState } from 'react'
import { Check, Save } from 'lucide-react'
import { ALL_FEATURES, FEATURE_LABELS, PLAN_LABELS, type PlanTier, type FeatureKey } from '@/lib/plan-features'

interface Props {
  initial: Record<PlanTier, FeatureKey[]>
}

const TIER_COLORS: Record<PlanTier, { header: string; toggle: string; badge: string }> = {
  trial: {
    header: 'bg-gray-50 border-gray-200',
    toggle: 'bg-gray-400',
    badge:  'bg-gray-100 text-gray-600',
  },
  core: {
    header: 'bg-teal-50 border-teal-200',
    toggle: 'bg-teal-500',
    badge:  'bg-teal-100 text-teal-700',
  },
  pro: {
    header: 'bg-indigo-50 border-indigo-200',
    toggle: 'bg-indigo-500',
    badge:  'bg-indigo-100 text-indigo-700',
  },
}

export function PlanTierEditor({ initial }: Props) {
  const [features, setFeatures] = useState<Record<PlanTier, Set<FeatureKey>>>({
    trial: new Set(initial.trial),
    core:  new Set(initial.core),
    pro:   new Set(initial.pro),
  })
  const [saving, setSaving] = useState<PlanTier | null>(null)
  const [saved,  setSaved]  = useState<PlanTier | null>(null)

  function toggle(tier: PlanTier, key: FeatureKey) {
    setFeatures(prev => {
      const next = new Set(prev[tier])
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...prev, [tier]: next }
    })
    setSaved(null)
  }

  async function save(tier: PlanTier) {
    setSaving(tier)
    await fetch('/api/admin/plan-features', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, features: Array.from(features[tier]) }),
    })
    setSaving(null)
    setSaved(tier)
    setTimeout(() => setSaved(s => s === tier ? null : s), 3000)
  }

  const tiers: PlanTier[] = ['trial', 'core', 'pro']

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => {
          const colors = TIER_COLORS[tier]
          const count  = features[tier].size
          return (
            <div key={tier} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              {/* Header */}
              <div className={`px-4 py-3 border-b ${colors.header} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {PLAN_LABELS[tier]}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{count}/{ALL_FEATURES.length} features</span>
              </div>

              {/* Feature toggles */}
              <div className="flex-1 flex flex-col divide-y divide-gray-50 px-1 py-1">
                {ALL_FEATURES.map(key => {
                  const on = features[tier].has(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggle(tier, key)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
                    >
                      <span className={`text-sm ${on ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                        {FEATURE_LABELS[key]}
                      </span>
                      <div className={`w-8 h-4 rounded-full transition-colors shrink-0 ml-3 flex items-center px-0.5 ${on ? colors.toggle : 'bg-gray-200'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Save */}
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => save(tier)}
                  disabled={saving === tier}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saved === tier
                    ? <><Check size={12} /> Saved</>
                    : saving === tier
                      ? 'Saving…'
                      : <><Save size={12} /> Save {PLAN_LABELS[tier]}</>
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">Changes apply immediately to all orgs on that plan.</p>
    </div>
  )
}
