'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Check } from 'lucide-react'

interface Photo { id: string; storage_path: string }

export function ClientPhotoUpload({ token, initialPhotos }: { token: string; initialPhotos: Photo[] }) {
  const [photos, setPhotos]   = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setDone(false)
    const form = new FormData()
    Array.from(files).forEach(f => form.append('photos', f))
    const res = await fetch(`/api/share/${token}/photos`, { method: 'POST', body: form })
    if (res.ok) {
      const saved: Photo[] = await res.json()
      setPhotos(p => [...saved, ...p])
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Camera size={15} className="text-gray-400" /> Your Photos
        </h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          ) : done ? (
            <><Check size={12} /> Uploaded!</>
          ) : (
            <><Upload size={12} /> Upload Photos</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400 hover:border-teal-300 hover:text-teal-400 transition-colors"
        >
          Tap to upload photos from your device
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <a key={photo.id} href={photo.storage_path} target="_blank" rel="noreferrer">
              <img
                src={photo.storage_path}
                alt="Client photo"
                className="w-full aspect-square object-cover rounded-lg border border-gray-100"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
