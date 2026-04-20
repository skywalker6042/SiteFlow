'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, PhoneInput } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Specialty, WorkerWithSpecialties } from '@/types'

interface WorkerFormProps {
  onSuccess: (worker?: WorkerWithSpecialties) => void
  specialties: Specialty[]
  worker?: WorkerWithSpecialties  // provided when editing
}

export function WorkerForm({ onSuccess, specialties, worker }: WorkerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:        worker?.name        ?? '',
    phone:       worker?.phone       ?? '',
    role:        worker?.role        ?? '',
    hourly_rate: (worker as any)?.hourly_rate ? String((worker as any).hourly_rate) : '',
  })
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(
    new Set(worker?.specialties?.map((s) => s.id) ?? [])
  )

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  function toggleSpecialty(id: string) {
    setSelectedSpecialties((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      specialty_ids: Array.from(selectedSpecialties),
    }

    let result: WorkerWithSpecialties | undefined
    if (worker) {
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      result = await res.json()
    } else {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    router.refresh()
    onSuccess(result)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Name *" id="worker-name" value={form.name} onChange={set('name')} required placeholder="Mike Johnson" />
      <PhoneInput label="Phone" id="worker-phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
      <Input label="Role / Title" id="worker-role" value={form.role} onChange={set('role')} placeholder="Foreman, Electrician..." />
      <Input label="Pay Rate ($/hr)" id="worker-rate" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={set('hourly_rate')} placeholder="Optional — e.g. 45.00" />

      {specialties.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">Specialties</p>
          <div className="grid grid-cols-2 gap-1">
            {specialties.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selectedSpecialties.has(s.id)}
                  onChange={() => toggleSpecialty(s.id)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm text-gray-700">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {specialties.length === 0 && (
        <p className="text-xs text-gray-400">
          No specialties set up yet. Go to Settings to add specialties.
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : worker ? 'Save Changes' : 'Add Crew Member'}
      </Button>
    </form>
  )
}
