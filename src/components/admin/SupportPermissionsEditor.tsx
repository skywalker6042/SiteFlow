'use client'

import { useState } from 'react'
import { Check, Save } from 'lucide-react'
import { CAP_GROUPS, type SupportCap } from '@/lib/support-permissions'
import { cn } from '@/lib/utils'

export function SupportPermissionsEditor({ initialCaps }: { initialCaps: SupportCap[] }) {
  const [caps, setCaps] = useState<SupportCap[]>(initialCaps)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(cap: SupportCap) {
    setCaps((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/admin/support-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caps),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-gray-500">
        Choose exactly what Support users can see and do. Admins always have full access regardless of these settings.
      </p>

      {CAP_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {group.caps.map(({ key, label }) => {
              const on = caps.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-left w-full transition-colors border-b border-gray-50 last:border-b-0',
                    on ? 'bg-teal-50' : 'bg-white hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    on ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                  )}>
                    {on && <Check size={9} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 self-start text-sm font-medium bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {saved
          ? <><Check size={13} /> Saved</>
          : <><Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}</>
        }
      </button>
    </div>
  )
}
