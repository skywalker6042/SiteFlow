'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Loader } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type { JobPhoto } from '@/types'

export function PhotoGrid({ jobId, photos: initialPhotos, canUpload = true }: { jobId: string; photos: JobPhoto[]; canUpload?: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError('')

    const results = await Promise.all(files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('job_id', jobId)
      const res = await fetch('/api/photos', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed (${res.status})`)
      }
      return res.json() as Promise<JobPhoto>
    }))

    setPhotos((prev) => [...results, ...prev])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    startTransition(() => router.refresh())
  }

  async function handleDelete(photo: JobPhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setPhotos((prev) => [photo, ...prev])
    }
    startTransition(() => router.refresh())
  }

  // If no photos and no upload permission, skip rendering entirely
  if (photos.length === 0 && !canUpload) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Photos</span>
          {canUpload && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-orange-500 font-medium disabled:opacity-50"
            >
              {uploading ? <Loader size={13} className="animate-spin" /> : <Camera size={13} />}
              {uploading ? 'Uploading...' : 'Add Photo'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {canUpload && <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />}

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {photos.length === 0 ? (
          canUpload ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-200 rounded-lg text-center text-sm text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors"
            >
              <Camera size={20} className="mx-auto mb-1" />
              Tap to add photos
            </button>
          ) : null
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={photo.storage_path}
                  alt={photo.caption ?? 'Job photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {canUpload && (
                  <button
                    onClick={() => handleDelete(photo)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
