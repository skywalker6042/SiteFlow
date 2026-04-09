'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Textarea, Select, PhoneInput } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Job } from '@/types'

interface JobFormProps {
  job?: Job
  onSuccess: () => void
}

export function JobForm({ job, onSuccess }: JobFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:           job?.name            ?? '',
    address:        job?.address         ?? '',
    client_name:    job?.client_name     ?? '',
    client_phone:   job?.client_phone    ?? '',
    scope:          job?.scope           ?? '',
    status:         job?.status          ?? 'not_started',
    percent_complete: job?.percent_complete ?? 0,
    total_value:    job?.total_value     ?? 0,
    amount_billed:  job?.amount_billed   ?? 0,
    amount_paid:    job?.amount_paid     ?? 0,
    planned_start:  job?.planned_start   ?? '',
    planned_end:    job?.planned_end     ?? '',
  })

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      percent_complete: Number(form.percent_complete),
      total_value:      Number(form.total_value),
      amount_billed:    Number(form.amount_billed),
      amount_paid:      Number(form.amount_paid),
    }

    if (job) {
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    router.refresh()
    onSuccess()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Job Name *" id="name" value={form.name} onChange={set('name')} required placeholder="Kitchen Remodel" />
      <Input label="Address" id="address" value={form.address} onChange={set('address')} placeholder="123 Main St" />
      <Input label="Client Name" id="client_name" value={form.client_name} onChange={set('client_name')} placeholder="John Smith" />
      <PhoneInput label="Client Phone" id="client_phone" value={form.client_phone} onChange={v => setForm(p => ({ ...p, client_phone: v }))} />
      <Textarea label="Scope of Work" id="scope" value={form.scope} onChange={set('scope')} rows={3} placeholder="Describe what work will be done..." />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Planned Start" id="planned_start" type="date" value={form.planned_start} onChange={set('planned_start')} />
        <Input label="Planned End" id="planned_end" type="date" value={form.planned_end} onChange={set('planned_end')} />
      </div>

      <Select
        label="Status"
        id="status"
        value={form.status}
        onChange={set('status')}
        options={[
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'done', label: 'Done' },
        ]}
      />
      <Input label="% Complete" id="percent_complete" type="number" min="0" max="100" value={form.percent_complete} onChange={set('percent_complete')} />

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contract Value ($)" id="total_value" type="number" min="0" step="0.01" value={form.total_value} onChange={set('total_value')} />
          <Input label="Billed ($)" id="amount_billed" type="number" min="0" step="0.01" value={form.amount_billed} onChange={set('amount_billed')} />
          <Input label="Paid ($)" id="amount_paid" type="number" min="0" step="0.01" value={form.amount_paid} onChange={set('amount_paid')} />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? 'Saving...' : job ? 'Save Changes' : 'Create Job'}
      </Button>
    </form>
  )
}
