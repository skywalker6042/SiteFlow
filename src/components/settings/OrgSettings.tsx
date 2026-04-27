'use client'

import { useState } from 'react'
import type { FinancialSettings as FinancialSettingsState } from '@/lib/financial-settings'

interface OrgSettingsProps {
  initial: {
    co_separate_invoice: boolean
    require_signature:   boolean
    track_worker_time:   boolean
    track_worker_job:    boolean
  }
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-teal-500' : 'bg-gray-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function Row({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

interface FinancialSettingsProps {
  initial: FinancialSettingsState
}

export function OrgSettings({ initial }: OrgSettingsProps) {
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving]     = useState<string | null>(null)

  async function update(key: keyof typeof settings, value: boolean) {
    setSaving(key)
    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings(s => ({ ...s, ...data }))
    }
    setSaving(null)
  }

  return (
    <div className="divide-y divide-gray-100">
      <Row
        label="Change orders as separate invoice"
        description="When enabled, change orders appear as a separate invoice section instead of being combined with the contract value."
        checked={settings.co_separate_invoice}
        onChange={v => update('co_separate_invoice', v)}
        disabled={saving === 'co_separate_invoice'}
      />
      <Row
        label="Require electronic signature"
        description="Clients must sign the invoice before it is considered accepted. Signature is captured on the invoice page."
        checked={settings.require_signature}
        onChange={v => update('require_signature', v)}
        disabled={saving === 'require_signature'}
      />
    </div>
  )
}

export function CrewSettings({ initial }: OrgSettingsProps) {
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving]     = useState<string | null>(null)

  async function update(key: keyof typeof settings, value: boolean) {
    setSaving(key)
    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings(s => ({ ...s, ...data }))
    }
    setSaving(null)
  }

  return (
    <div className="divide-y divide-gray-100">
      <Row
        label="Worker time tracking"
        description="Crew members see a Clock In / Clock Out button to log their work hours each day."
        checked={settings.track_worker_time}
        onChange={v => update('track_worker_time', v)}
        disabled={saving === 'track_worker_time'}
      />
      <Row
        label="Track which job workers are on"
        description="When clocking in, workers can optionally select the job they are working on. Requires time tracking to be enabled."
        checked={settings.track_worker_job}
        onChange={v => update('track_worker_job', v)}
        disabled={!settings.track_worker_time || saving === 'track_worker_job'}
      />
    </div>
  )
}

export function FinancialSettings({ initial }: FinancialSettingsProps) {
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving] = useState<string | null>(null)

  async function update(key: keyof typeof settings, value: boolean) {
    setSaving(key)
    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings((s) => ({ ...s, ...data }))
    }
    setSaving(null)
  }

  return (
    <div className="divide-y divide-gray-100">
      <Row
        label="Include labor in profitability"
        description="Labor hours and hourly rates count toward tracked costs, margin, and cost charts."
        checked={settings.financial_include_labor}
        onChange={(v) => update('financial_include_labor', v)}
        disabled={saving === 'financial_include_labor'}
      />
      <Row
        label="Include receipts in profitability"
        description="Receipt totals count toward tracked costs. Turn this off if you want receipts stored but excluded from financial reporting."
        checked={settings.financial_include_receipts}
        onChange={(v) => update('financial_include_receipts', v)}
        disabled={saving === 'financial_include_receipts'}
      />
      <Row
        label="Include approved change orders in revenue"
        description="Approved change orders are added to sold work, outstanding balances, and pipeline value."
        checked={settings.financial_include_change_orders}
        onChange={(v) => update('financial_include_change_orders', v)}
        disabled={saving === 'financial_include_change_orders'}
      />
      <Row
        label="Show labor breakdown"
        description="Display the worker hours and labor detail section on the financials page."
        checked={settings.financial_show_labor_breakdown}
        onChange={(v) => update('financial_show_labor_breakdown', v)}
        disabled={saving === 'financial_show_labor_breakdown'}
      />
      <Row
        label="Show receipt breakdown"
        description="Display receipt totals and top receipt categories on the financials page."
        checked={settings.financial_show_receipt_breakdown}
        onChange={(v) => update('financial_show_receipt_breakdown', v)}
        disabled={saving === 'financial_show_receipt_breakdown'}
      />
    </div>
  )
}
