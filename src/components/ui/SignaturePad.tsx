'use client'

import { useRef, useState, useEffect } from 'react'
import { Trash2, Check } from 'lucide-react'

interface SignaturePadProps {
  jobId: string
  token: string
  invoiceType?: string
  onSigned: (signerName: string) => void
}

export function SignaturePad({ jobId, token, invoiceType = 'contract', onSigned }: SignaturePadProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing]     = useState(false)
  const [hasStroke, setHasStroke] = useState(false)
  const [name, setName]           = useState('')
  const [saving, setSaving]       = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current!
    const pos = getPos(e, canvas)
    lastPos.current = pos
    setDrawing(true)
    setHasStroke(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
  }

  function endDraw() {
    setDrawing(false)
    lastPos.current = null
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
  }

  async function submit() {
    if (!hasStroke) return
    setSaving(true)
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    await fetch(`/api/jobs/${jobId}/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_data: dataUrl, signer_name: name || null, token, invoice_type: invoiceType }),
    })
    setSaving(false)
    onSigned(name || 'Client')
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name (optional)"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
      />
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full touch-none"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStroke && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">
            Sign here
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={clear}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors"
        >
          <Trash2 size={12} /> Clear
        </button>
        <button
          onClick={submit}
          disabled={!hasStroke || saving}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-gray-900 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          <Check size={14} /> {saving ? 'Saving…' : 'Sign Invoice'}
        </button>
      </div>
    </div>
  )
}
