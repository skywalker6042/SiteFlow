'use client'

import { useState } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'

const inp = 'w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teal-400 bg-white placeholder:text-gray-400'

export function GetStartedForm() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) { setError('Name and email are required.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        org_name: company || null,
        type:     'general',
        subject:  `Trial Request — ${company || name}`,
        message:  `New trial request.\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || 'Not provided'}`,
      }),
    })
    setLoading(false)
    if (res.ok) setDone(true)
    else setError('Something went wrong. Please try again.')
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={26} className="text-green-600" />
        </div>
        <p className="text-base font-bold text-gray-900">You're on the list!</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          We'll reach out to <strong>{email}</strong> shortly to get your account set up.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">Your name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" className={inp} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">Email address *</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className={inp} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">Company name</label>
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ABC Construction LLC" className={inp} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-teal-200 mt-1"
      >
        {loading ? 'Submitting…' : <><span>Request Access</span><ArrowRight size={15} /></>}
      </button>

      <p className="text-xs text-gray-400 text-center">No credit card required · We'll email you to get started</p>
    </form>
  )
}
