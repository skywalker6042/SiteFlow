'use client'

import { useState } from 'react'
import { Link2, Copy, Trash2, Check, ExternalLink, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export function ShareJobButton({ jobId, initialToken, allowInvoice = true }: { jobId: string; initialToken: string | null; allowInvoice?: boolean }) {
  const [token, setToken]         = useState<string | null>(initialToken)
  const [copied, setCopied]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
  const [withInvoice, setWithInvoice] = useState(false)

  const shareUrl  = token ? `${BASE_URL}/share/${token}` : null
  const activeUrl = token ? `${BASE_URL}/share/${token}${withInvoice ? '?invoice=1' : ''}` : null

  async function generate() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/jobs/${jobId}/share`, { method: 'POST' })
      const data = await res.json()
      setToken(data.token)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    if (!confirm('Revoke this link? Anyone with the link will lose access.')) return
    setLoading(true)
    try {
      await fetch(`/api/jobs/${jobId}/share`, { method: 'DELETE' })
      setToken(null)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!activeUrl) return
    await navigator.clipboard.writeText(activeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={token ? () => setOpen(true) : generate}
        disabled={loading}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
          token
            ? 'text-teal-600 border border-teal-200 hover:border-teal-400 bg-teal-50'
            : 'text-gray-500 hover:text-teal-500 border border-gray-200 hover:border-teal-300'
        }`}
      >
        <Link2 size={14} />
        {loading ? 'Generating…' : token ? 'Link active' : 'Share with client'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Client share link">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">Anyone with this link can view job progress. No login required.</p>

          {/* Invoice toggle — only shown when invoices feature is enabled */}
          {allowInvoice && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setWithInvoice(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${withInvoice ? 'bg-teal-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${withInvoice ? 'translate-x-4' : ''}`} />
              </div>
              <span className="flex items-center gap-1.5 text-sm text-gray-700">
                <FileText size={13} className="text-gray-400" />
                Include invoice
              </span>
            </label>
          )}

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-600 flex-1 truncate">{activeUrl}</span>
            <a href={activeUrl!} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700 shrink-0">
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white py-2.5 rounded-lg transition-colors"
            >
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
            </button>
            <button
              onClick={revoke}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              title="Revoke link"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
