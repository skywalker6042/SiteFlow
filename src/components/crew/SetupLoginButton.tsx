'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, X, Eye, EyeOff, Trash2 } from 'lucide-react'

interface Props {
  workerId: string
  workerName: string
  loginEmail: string | null
}

export function SetupLoginButton({ workerId, workerName, loginEmail }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/workers/${workerId}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
      setOpen(false); setEmail(''); setPassword('')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleRevoke() {
    if (!confirm(`Remove login for ${workerName}? They will no longer be able to sign in.`)) return
    setLoading(true)
    try {
      await fetch(`/api/workers/${workerId}/login`, { method: 'DELETE' })
      router.refresh()
    } finally { setLoading(false) }
  }

  if (loginEmail) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
          <LogIn size={9} /> {loginEmail}
        </span>
        <button onClick={handleRevoke} disabled={loading} className="text-gray-200 hover:text-red-400 p-0.5 transition-colors" title="Remove login">
          <Trash2 size={11} />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] text-gray-400 hover:text-orange-500 font-medium flex items-center gap-0.5 transition-colors"
        title="Set up login for this crew member"
      >
        <LogIn size={10} /> Set up login
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4 p-0" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Create login for {workerName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">They'll use this to sign in to SiteFlow</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="worker@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temporary password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading || !email || !password}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg">
                  {loading ? 'Creating…' : 'Create login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
