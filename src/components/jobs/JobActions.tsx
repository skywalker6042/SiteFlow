'use client'

import { useState } from 'react'
import { MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { JobForm } from './JobForm'
import { useRouter } from 'next/navigation'
import type { Job } from '@/types'

export function JobActions({ job }: { job: Job }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    router.push('/jobs')
    router.refresh()
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <MoreVertical size={18} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-40 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setEditOpen(true); setMenuOpen(false) }}
              >
                <Edit size={14} />
                Edit Job
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                onClick={() => { setMenuOpen(false); handleDelete() }}
                disabled={deleting}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Job">
        <JobForm job={job} onSuccess={() => setEditOpen(false)} />
      </Modal>
    </>
  )
}
