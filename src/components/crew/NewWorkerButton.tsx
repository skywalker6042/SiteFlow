'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { WorkerForm } from './WorkerForm'
import type { Specialty } from '@/types'

export function NewWorkerButton({ specialties }: { specialties: Specialty[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus size={15} />
        Add Worker
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Crew Member">
        <WorkerForm specialties={specialties} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  )
}
