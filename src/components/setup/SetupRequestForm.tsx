'use client'

import { useState } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'

const inp = 'w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-400 bg-white placeholder:text-gray-400 transition-colors'

export function SetupRequestForm() {
  const [form, setForm] = useState({
    organization_name: '',
    contact_name:      '',
    email:             '',
    phone:             '',
    workers_count:     '',
    project_details:   '',
    notes:             '',
  })
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.organization_name || !form.contact_name || !form.email) {
      setError('Please fill in Organization, Contact Name, and Email.')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/setup-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        workers_count: form.workers_count ? parseInt(form.workers_count) : null,
      }),
    })
    setLoading(false)
    if (res.ok) setDone(true)
    else setError('Something went wrong. Please try again.')
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={26} className="text-green-600" />
        </div>
        <p className="text-lg font-bold text-gray-900">Request received!</p>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          We'll reach out to <strong>{form.email}</strong> within 1 business day to schedule your setup.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Organization Name *">
          <input value={form.organization_name} onChange={e => set('organization_name', e.target.value)}
            placeholder="ABC Construction LLC" className={inp} />
        </Field>
        <Field label="Your Name *">
          <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            placeholder="John Smith" className={inp} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email Address *">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="john@abcconstruction.com" className={inp} />
        </Field>
        <Field label="Phone (optional)">
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="555-123-4567" className={inp} />
        </Field>
      </div>

      <Field label="How many workers are on your team?">
        <input type="number" min="1" value={form.workers_count} onChange={e => set('workers_count', e.target.value)}
          placeholder="e.g. 8" className={inp} />
      </Field>

      <Field label="Current or upcoming projects">
        <textarea value={form.project_details} onChange={e => set('project_details', e.target.value)}
          rows={4}
          placeholder="Briefly describe your active or upcoming projects — project names, types, locations, timelines, etc."
          className={`${inp} resize-none`}
        />
      </Field>

      <Field label="Additional notes (optional)">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Anything else we should know — special requirements, questions, how you heard about us…"
          className={`${inp} resize-none`}
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm py-4 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-teal-200"
      >
        {loading ? 'Submitting…' : <><span>Submit Setup Request</span><ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 tracking-wide">{label}</label>
      {children}
    </div>
  )
}
