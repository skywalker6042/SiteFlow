'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, X, Loader } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import type { ChangeOrder } from '@/types'

export function ChangeOrderList({
  jobId,
  changeOrders: initialOrders,
  canManage = true,
}: {
  jobId: string
  changeOrders: ChangeOrder[]
  canManage?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [orders, setOrders] = useState<ChangeOrder[]>(initialOrders)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ description: '', amount: '' })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, description: form.description, amount: Number(form.amount) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status}`)
        return
      }
      const co = await res.json()
      setOrders((prev) => [co, ...prev])
      setOpen(false)
      setForm({ description: '', amount: '' })
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  async function toggleApproved(co: ChangeOrder) {
    // Optimistic
    setOrders((prev) => prev.map((o) => o.id === co.id ? { ...o, approved: !co.approved } : o))
    const res = await fetch(`/api/change-orders/${co.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: !co.approved }),
    })
    if (!res.ok) {
      // Roll back
      setOrders((prev) => prev.map((o) => o.id === co.id ? { ...o, approved: co.approved } : o))
    }
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    // Optimistic
    setOrders((prev) => prev.filter((o) => o.id !== id))
    const res = await fetch(`/api/change-orders/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // Roll back — re-fetch
      startTransition(() => router.refresh())
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Change Orders</span>
            {canManage && (
              <button
                onClick={() => { setOpen(true); setError('') }}
                className="flex items-center gap-1 text-xs text-orange-500 font-medium hover:text-orange-600"
              >
                <Plus size={13} /> Add
              </button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">No change orders yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map((co) => (
                <div key={co.id} className="flex items-start gap-2">
                  <button
                    onClick={() => canManage && toggleApproved(co)}
                    disabled={!canManage}
                    title={co.approved ? 'Approved — click to unapprove' : 'Click to approve'}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      co.approved
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 text-transparent hover:border-green-400'
                    } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <Check size={10} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${co.approved ? 'text-gray-900' : 'text-gray-500'}`}>
                      {co.description}
                    </p>
                    {co.approved && (
                      <p className="text-[10px] text-green-600 font-medium mt-0.5">Approved</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-semibold ${co.approved ? 'text-green-600' : 'text-gray-400'}`}>
                      +{formatCurrency(Number(co.amount))}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(co.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Delete change order"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Change Order">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Textarea
            label="Description *"
            id="co-desc"
            value={form.description}
            onChange={set('description')}
            rows={2}
            required
            placeholder="Extra electrical work in master suite..."
          />
          <Input
            label="Amount ($) *"
            id="co-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
            required
            placeholder="0.00"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader size={14} className="animate-spin inline mr-1.5" />Adding...</> : 'Add Change Order'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
