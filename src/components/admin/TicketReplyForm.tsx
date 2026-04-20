'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    await fetch(`/api/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    setMessage('')
    setSending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
        placeholder="Type your reply…"
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-400 resize-none"
      />
      <button
        onClick={send}
        disabled={!message.trim() || sending}
        className="self-end flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
      >
        <Send size={14} />
        {sending ? 'Sending…' : 'Send Reply'}
      </button>
    </div>
  )
}
