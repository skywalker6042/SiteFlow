'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ExternalLink, ChevronDown, Loader } from 'lucide-react'

type OrgStatus     = 'trial' | 'active' | 'suspended'
type BillingStatus = 'unpaid' | 'paid' | 'not_required'

interface Org {
  id: string
  name: string
  slug: string | null
  status: OrgStatus
  billing_status: BillingStatus
  paid_until: string | null
  trial_ends_at: string | null
  member_count: number
  job_count: number
  last_activity: string | null
  created_at: string
}

const STATUS_STYLES: Record<OrgStatus, string> = {
  active:    'bg-green-100  text-green-700',
  trial:     'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100    text-red-600',
}

const BILLING_STYLES: Record<BillingStatus, string> = {
  paid:         'bg-blue-100  text-blue-700',
  unpaid:       'bg-gray-100  text-gray-500',
  not_required: 'bg-gray-50   text-gray-400',
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function StatusBadge({ status }: { status: OrgStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'trial' ? 'bg-yellow-400' : 'bg-red-500'}`} />
      {status}
    </span>
  )
}

function BillingBadge({ status, paidUntil }: { status: BillingStatus; paidUntil: string | null }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${BILLING_STYLES[status]}`}>
      {status === 'paid' && paidUntil ? `Paid · ${new Date(paidUntil).toLocaleDateString()}` : status.replace('_', ' ')}
    </span>
  )
}

function OrgRow({ org }: { org: Org }) {
  const router = useRouter()
  const [status, setStatus]           = useState<OrgStatus>(org.status)
  const [billing, setBilling]         = useState<BillingStatus>(org.billing_status)
  const [paidUntil, setPaidUntil]     = useState<string | null>(org.paid_until)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(org.trial_ends_at)
  const [loading, setLoading]         = useState(false)
  const [entering, setEntering]       = useState(false)
  const [open, setOpen]               = useState(false)
  const [trialDays, setTrialDays]     = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openMenu() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right })
    setOpen(true)
  }

  async function patch(body: object) {
    setOpen(false)
    setLoading(true)
    const res = await fetch(`/api/admin/orgs/${org.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.status)             setStatus(data.status)
      if (data.billing_status)     setBilling(data.billing_status)
      if ('paid_until' in data)    setPaidUntil(data.paid_until)
      if ('trial_ends_at' in data) setTrialEndsAt(data.trial_ends_at)
    }
    setLoading(false)
  }

  async function enterOrg() {
    setEntering(true)
    const res = await fetch('/api/admin/set-active-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: org.id }),
    })
    if (res.ok) {
      router.push('/dashboard')
    }
    setEntering(false)
  }

  async function setTrialExpiry() {
    const days = parseInt(trialDays, 10)
    if (isNaN(days) || days < 1) return
    await patch({ trial_days: days })
    setTrialDays('')
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Org name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-orange-400" />
          </div>
          <div>
            <Link href={`/admin/orgs/${org.id}`} className="text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors">
              {org.name}
            </Link>
            {org.slug && <p className="text-xs text-gray-400 font-mono">{org.slug}</p>}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {loading && <Loader size={12} className="animate-spin text-gray-300" />}
        </div>
      </td>

      {/* Billing */}
      <td className="px-4 py-3.5">
        <BillingBadge status={billing} paidUntil={paidUntil} />
      </td>

      {/* Stats */}
      <td className="px-4 py-3.5 text-sm text-gray-500">{String(org.member_count)} members</td>
      <td className="px-4 py-3.5 text-sm text-gray-500">{String(org.job_count)} jobs</td>
      <td className="px-4 py-3.5 text-xs text-gray-400">{timeAgo(org.last_activity)}</td>
      <td className="px-4 py-3.5 text-xs text-gray-400">{new Date(org.created_at).toLocaleDateString()}</td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 justify-end">
          {/* Enter org */}
          <button
            onClick={enterOrg}
            disabled={entering}
            className="text-xs font-medium text-orange-600 border border-orange-200 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {entering ? <Loader size={11} className="animate-spin" /> : <ExternalLink size={11} />} Enter
          </button>

          {/* Status dropdown */}
          <button
            ref={btnRef}
            onClick={openMenu}
            disabled={loading}
            className="text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-400 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            Status <ChevronDown size={11} />
          </button>
          {open && (
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
              className="w-44 bg-white rounded-xl shadow-2xl border border-gray-100 py-1"
            >
              <DropItem label="Activate"      onClick={() => patch({ status: 'active' })}           active={status === 'active'} />
              <DropItem label="Set to Trial"  onClick={() => patch({ status: 'trial' })}            active={status === 'trial'} />
              <DropItem label="Suspend"       onClick={() => patch({ status: 'suspended' })}        active={status === 'suspended'} danger />
              <div className="border-t border-gray-100 my-1" />
              {/* Trial expiry */}
              <div className="px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 font-semibold">
                  Trial expires{trialEndsAt ? `: ${new Date(trialEndsAt).toLocaleDateString()}` : ''}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    placeholder="days"
                    value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setTrialExpiry()}
                    className="w-16 text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={setTrialExpiry}
                    className="text-xs bg-orange-500 text-white px-2 py-1 rounded-md hover:bg-orange-600 transition-colors"
                  >
                    Set
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-100 my-1" />
              <DropItem label="Mark Paid"     onClick={() => patch({ billing_status: 'paid' })}         active={billing === 'paid'} />
              <DropItem label="Mark Unpaid"   onClick={() => patch({ billing_status: 'unpaid' })}       active={billing === 'unpaid'} />
              <DropItem label="Billing N/A"   onClick={() => patch({ billing_status: 'not_required' })} active={billing === 'not_required'} />
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function DropItem({ label, onClick, active, danger }: { label: string; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
        active ? 'font-semibold text-gray-900 bg-gray-50' :
        danger  ? 'text-red-600 hover:bg-red-50' :
                  'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

export function OrgTable({ orgs }: { orgs: Org[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Active</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => <OrgRow key={org.id} org={org} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
