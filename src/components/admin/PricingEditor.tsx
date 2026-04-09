'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check } from 'lucide-react'

const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-white'

const FIELDS = [
  { key: 'price_trial_days', label: 'Trial Duration (days)',    prefix: '',  suffix: 'days', hint: 'How long the free trial lasts' },
  { key: 'price_core',       label: 'Core Plan Price',          prefix: '$', suffix: '/mo',  hint: 'Monthly price for the Core plan' },
  { key: 'price_pro',        label: 'Pro Plan Price',           prefix: '$', suffix: '/mo',  hint: 'Monthly price for the Pro plan' },
  { key: 'price_setup',      label: 'Done-For-You Setup Price', prefix: '$', suffix: 'one-time', hint: 'One-time Pro Setup service price' },
]

export function PricingEditor({ initial }: { initial: Record<string, string> }) {
  const router  = useRouter()
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/pricing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">
      {FIELDS.map(({ key, label, prefix, suffix, hint }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">{label}</label>
          <p className="text-xs text-gray-400">{hint}</p>
          <div className="flex items-center gap-2">
            {prefix && <span className="text-sm font-bold text-gray-500 w-4">{prefix}</span>}
            <input
              type="number"
              min="0"
              value={values[key] ?? ''}
              onChange={e => set(key, e.target.value)}
              className={inp}
            />
            <span className="text-xs text-gray-400 shrink-0">{suffix}</span>
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
      >
        {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : <><Save size={14} /> Save Changes</>}
      </button>
    </div>
  )
}
