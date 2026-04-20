'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Check, Loader, Trash2, ChevronDown, ChevronUp, Receipt, DollarSign, Filter } from 'lucide-react'

const CATEGORIES = [
  'Materials', 'Tools & Equipment', 'Gas & Fuel', 'Permits & Fees',
  'Insurance', 'Utilities', 'Office & Admin', 'Meals', 'Subcontractors',
  'Labor', 'Other',
]

interface ReceiptRow {
  id: string
  job_id: string | null
  job_name: string | null
  image_path: string | null
  vendor: string | null
  date: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  category: string
  description: string | null
  notes: string | null
  created_at: string
}

interface Job { id: string; name: string }

interface ScannedData {
  vendor: string | null
  date: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  category: string
  description: string | null
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    'Materials':         'bg-blue-100 text-blue-700',
    'Tools & Equipment': 'bg-purple-100 text-purple-700',
    'Gas & Fuel':        'bg-yellow-100 text-yellow-700',
    'Permits & Fees':    'bg-red-100 text-red-700',
    'Insurance':         'bg-pink-100 text-pink-700',
    'Utilities':         'bg-cyan-100 text-cyan-700',
    'Office & Admin':    'bg-gray-100 text-gray-700',
    'Meals':             'bg-orange-100 text-orange-700',
    'Subcontractors':    'bg-indigo-100 text-indigo-700',
    'Labor':             'bg-teal-100 text-teal-700',
    'Other':             'bg-gray-100 text-gray-500',
  }
  return map[cat] ?? 'bg-gray-100 text-gray-500'
}

// ─── Scan + Review Modal ──────────────────────────────────────────────────────

function ScanModal({ jobs, onClose, onSaved }: {
  jobs: Job[]
  onClose: () => void
  onSaved: () => void
}) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [step, setStep]           = useState<'upload' | 'scanning' | 'review'>('upload')
  const [preview, setPreview]     = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState<ScannedData & { job_id: string; notes: string }>({
    vendor: '', date: '', subtotal: null, tax: null, total: null,
    category: 'Other', description: '', job_id: '', notes: '',
  })

  const handleFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setStep('scanning')

    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/receipts/scan', { method: 'POST', body: fd })
    const { imagePath: ip, extracted } = await res.json()
    setImagePath(ip)

    if (extracted) {
      setForm(f => ({
        ...f,
        vendor:   extracted.vendor   ?? '',
        date:     extracted.date     ?? '',
        subtotal: extracted.subtotal ?? null,
        tax:      extracted.tax      ?? null,
        total:    extracted.total    ?? null,
        category: extracted.category ?? 'Other',
      }))
    }

    setStep('review')
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, image_path: imagePath }),
    })
    setSaving(false)
    onSaved()
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={(form[key] as string | number) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900">
            {step === 'upload' ? 'Add Receipt' : step === 'scanning' ? 'Reading Receipt…' : 'Review & Save'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* Upload step */}
          {step === 'upload' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-500">Take a photo or upload an image of your receipt.</p>

              {/* Camera capture (mobile) */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-teal-300 text-teal-600 font-medium text-sm hover:bg-teal-50 transition-colors"
              >
                <Camera size={20} /> Take Photo
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {/* File upload */}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium text-sm hover:border-teal-300 hover:text-teal-500 transition-colors"
              >
                <Upload size={18} /> Upload from Device
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {/* Scanning step */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center gap-4 py-8">
              {preview && <img src={preview} alt="Receipt" className="max-h-48 object-contain rounded-xl border border-gray-100" />}
              <div className="flex items-center gap-2 text-teal-600 text-sm font-medium">
                <Loader size={16} className="animate-spin" />
                Reading receipt text…
              </div>
              <p className="text-xs text-gray-400">Takes a few seconds — review and fix anything after</p>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="flex flex-col gap-4">
              {preview && (
                <img src={preview} alt="Receipt" className="max-h-40 w-full object-contain rounded-xl border border-gray-100 bg-gray-50" />
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500">
                Text was read from the image — review each field and correct anything that looks off.
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Vendor / Store', 'vendor')}
                {field('Date', 'date', 'date')}
                {field('Subtotal ($)', 'subtotal', 'number')}
                {field('Tax ($)', 'tax', 'number')}
                {field('Total ($)', 'total', 'number')}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {field('Description', 'description')}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Attach to Job (optional)</label>
                <select
                  value={form.job_id}
                  onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">General expense (no job)</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>

              {field('Notes', 'notes')}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving…' : 'Save Receipt'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Receipt Row ──────────────────────────────────────────────────────────────

function ReceiptCard({ receipt, jobs, onUpdated }: {
  receipt: ReceiptRow
  jobs: Job[]
  onUpdated: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    vendor:      receipt.vendor      ?? '',
    date:        receipt.date        ?? '',
    subtotal:    receipt.subtotal,
    tax:         receipt.tax,
    total:       receipt.total,
    category:    receipt.category,
    description: receipt.description ?? '',
    job_id:      receipt.job_id      ?? '',
    notes:       receipt.notes       ?? '',
  })

  async function handleSave() {
    await fetch(`/api/receipts/${receipt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setEditing(false)
    onUpdated()
  }

  async function handleDelete() {
    if (!confirm('Delete this receipt?')) return
    setDeleting(true)
    await fetch(`/api/receipts/${receipt.id}`, { method: 'DELETE' })
    onUpdated()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {receipt.image_path && (
          <img src={receipt.image_path} alt="Receipt" className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
        )}
        {!receipt.image_path && (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Receipt size={16} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{receipt.vendor || 'Unknown vendor'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(receipt.category)}`}>
              {receipt.category}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {receipt.date && <span className="text-xs text-gray-400">{new Date(receipt.date).toLocaleDateString()}</span>}
            {receipt.job_name && <span className="text-xs text-gray-400">· {receipt.job_name}</span>}
            {receipt.description && <span className="text-xs text-gray-400 truncate">· {receipt.description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-gray-900">{fmt(receipt.total)}</span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          {!editing ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Subtotal</p><p className="font-medium">{fmt(receipt.subtotal)}</p></div>
                <div><p className="text-xs text-gray-400">Tax</p><p className="font-medium">{fmt(receipt.tax)}</p></div>
                <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-gray-900">{fmt(receipt.total)}</p></div>
              </div>
              {receipt.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{receipt.notes}</p>}
              {receipt.image_path && (
                <a href={receipt.image_path} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">
                  View full image
                </a>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(true)} className="text-xs text-teal-600 font-medium hover:text-teal-700">Edit</button>
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 font-medium hover:text-red-600 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {(['vendor', 'date', 'subtotal', 'tax', 'total'] as const).map(key => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{key}</label>
                    <input
                      type={['subtotal','tax','total'].includes(key) ? 'number' : key === 'date' ? 'date' : 'text'}
                      value={(form[key] as string | number) ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: ['subtotal','tax','total'].includes(key) ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Attach to Job</label>
                <select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">General expense</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 bg-teal-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-teal-600">Save</button>
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReceiptsClient({ receipts: initial, jobs }: { receipts: ReceiptRow[]; jobs: Job[] }) {
  const router                    = useRouter()
  const [showScan, setShowScan]   = useState(false)
  const [receipts, setReceipts]   = useState(initial)
  const [filterCat, setFilterCat] = useState('')
  const [filterJob, setFilterJob] = useState('')

  const reload = async () => {
    const res = await fetch('/api/receipts')
    if (res.ok) setReceipts(await res.json())
    router.refresh()
  }

  const filtered = receipts.filter(r =>
    (!filterCat || r.category === filterCat) &&
    (!filterJob || r.job_id === filterJob)
  )

  const totalAll    = receipts.reduce((s, r) => s + Number(r.total ?? 0), 0)
  const totalShown  = filtered.reduce((s, r) => s + Number(r.total ?? 0), 0)
  const jobTotal    = receipts.filter(r => r.job_id).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const generalTotal = receipts.filter(r => !r.job_id).reduce((s, r) => s + Number(r.total ?? 0), 0)

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Receipts</h1>
          <p className="text-xs text-gray-400 mt-0.5">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · ${totalAll.toFixed(2)} total</p>
        </div>
        <button
          onClick={() => setShowScan(true)}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Receipt size={16} /> Add Receipt
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Spent</p>
          <p className="text-xl font-bold text-gray-900">${totalAll.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Job Costs</p>
          <p className="text-xl font-bold text-gray-900">${jobTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">General Costs</p>
          <p className="text-xl font-bold text-gray-900">${generalTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={filterJob}
          onChange={e => setFilterJob(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          <option value="">All jobs</option>
          <option value="__general__">General only</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        {(filterCat || filterJob) && (
          <button onClick={() => { setFilterCat(''); setFilterJob('') }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
        {(filterCat || filterJob) && (
          <span className="text-xs text-gray-400 self-center ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} · ${totalShown.toFixed(2)}
          </span>
        )}
      </div>

      {/* Receipt list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {receipts.length === 0 ? 'No receipts yet. Tap "Scan Receipt" to add your first one.' : 'No receipts match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(r => (
            <ReceiptCard key={r.id} receipt={r} jobs={jobs} onUpdated={reload} />
          ))}
        </div>
      )}

      {showScan && (
        <ScanModal
          jobs={jobs}
          onClose={() => setShowScan(false)}
          onSaved={() => { setShowScan(false); reload() }}
        />
      )}
    </div>
  )
}
