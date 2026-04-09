'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { JobForm } from './JobForm'

export function NewJobButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus size={15} />
        New Job
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Job">
        <JobForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  )
}
