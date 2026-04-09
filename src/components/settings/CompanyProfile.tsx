'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from 'lucide-react'
import { Input, PhoneInput } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function CompanyProfile({ initialName, initialPhone }: { initialName: string; initialPhone: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await fetch('/api/org/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      startTransition(() => router.refresh())
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <Input
        label="Company name"
        id="org-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <PhoneInput
        label="Company phone"
        id="org-phone"
        value={phone}
        onChange={setPhone}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button type="submit" disabled={saving} className="self-start">
        {saving ? <><Loader size={13} className="animate-spin inline mr-1.5" />Saving…</> : saved ? 'Saved!' : 'Save'}
      </Button>
    </form>
  )
}
