'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, Loader } from 'lucide-react'

export function LogoUpload({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/org/logo', { method: 'POST', body: formData })
    if (res.ok) {
      const data = await res.json()
      // Bust cache by appending timestamp
      setLogoUrl(data.logo_url + '?t=' + Date.now())
      startTransition(() => router.refresh())
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Upload failed')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    setUploading(true)
    await fetch('/api/org/logo', { method: 'DELETE' })
    setLogoUrl(null)
    setUploading(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-4">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleUpload} />

      {/* Preview */}
      <div
        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-orange-300 transition-colors shrink-0"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain p-1" />
        ) : uploading ? (
          <Loader size={20} className="text-gray-300 animate-spin" />
        ) : (
          <Upload size={20} className="text-gray-300" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 leading-relaxed">
          Shown on client-facing share pages.<br />PNG, JPG, WebP or SVG. Recommended: square.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload logo'}
          </button>
          {logoUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="text-xs font-medium text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
