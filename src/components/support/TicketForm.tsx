'use client'

import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'

const TICKET_TYPES = [
  { value: 'bug',     label: 'Bug / Issue' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Question' },
]

interface Props {
  initialName:  string
  initialEmail: string
  initialOrg:   string
}

export function TicketForm({ initialName, initialEmail, initialOrg }: Props) {
  const [name,    setName]    = useState(initialName)
  const [email,   setEmail]   = useState(initialEmail)
  const [org,     setOrg]     = useState(initialOrg)
  const [type,    setType]    = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !subject || !message) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, org_name: org || null, type, subject, message }),
    })
    setLoading(false)
    if (res.ok) {
      setDone(true)
      setSubject('')
      setMessage('')
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={22} className="text-green-600" />
        </div>
        <p className="text-base font-semibold text-gray-900">Request received!</p>
        <p className="text-sm text-gray-500 max-w-xs">We'll get back to you at {email} as soon as possible.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-2 text-sm text-orange-500 hover:underline"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name *">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Smith"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-white"
          />
        </Field>
        <Field label="Email address *">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-white"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Company">
          <input
            value={org}
            onChange={e => setOrg(e.target.value)}
            placeholder="Your company name"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-400 bg-white"
          />
        </Field>
        <Field label="Request type">
          <select value={type} onChange={e => setType(e.target.value)} className="input">
            {TICKET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Subject *">
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief summary of your request"
          className="input"
        />
      </Field>

      <Field label="Message *">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={6}
          placeholder="Describe your issue or request in detail. Include steps to reproduce if it's a bug."
          className="input resize-none"
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        <Send size={15} />
        {loading ? 'Sending…' : 'Send Request'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  )
}
