'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Specialty } from '@/types'

export function SpecialtyManager({ initialSpecialties }: { initialSpecialties: Specialty[] }) {
  const router = useRouter()
  const [specialties, setSpecialties] = useState<Specialty[]>(initialSpecialties)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')

    const res = await fetch('/api/specialties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })

    if (res.status === 409) {
      setError('That specialty already exists')
      setAdding(false)
      return
    }

    const specialty = await res.json()
    setSpecialties((prev) => [...prev, specialty].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setAdding(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setSpecialties((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/specialties/${id}`, { method: 'DELETE' })
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="flex-1">
          <Input
            id="new-specialty"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError('') }}
            placeholder="e.g. Electrician, Plumbing, HVAC..."
            error={error}
          />
        </div>
        <Button type="submit" disabled={adding || !newName.trim()} size="md">
          <Plus size={15} />
          Add
        </Button>
      </form>

      {specialties.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No specialties yet. Add your first one above.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {specialties.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-800">{s.name}</span>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
