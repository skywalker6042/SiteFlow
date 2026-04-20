'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check, Upload, Trash2, Loader, RefreshCw } from 'lucide-react'
import type { BrandSettings } from '@/lib/site-config'

const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400 bg-white'

export function BrandEditor({ initial }: { initial: BrandSettings }) {
  const router     = useRouter()
  const inputRef   = useRef<HTMLInputElement>(null)
  const [siteName, setSiteName]   = useState(initial.site_name)
  const [color,    setColor]      = useState(initial.primary_color)
  const [logoUrl,  setLogoUrl]    = useState<string | null>(initial.logo_url)
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)
  const [uploading,setUploading]  = useState(false)
  const [error,    setError]      = useState('')

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/brand', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: siteName, primary_color: color }),
    })
    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/brand/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.logo_url + '?t=' + Date.now())
      router.refresh()
    } else {
      setError('Upload failed')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleLogoRemove() {
    setUploading(true)
    await fetch('/api/admin/brand/logo', { method: 'DELETE' })
    setLogoUrl(null)
    setUploading(false)
    router.refresh()
  }

  // Generate a slightly darker shade for the preview gradient
  function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }
  const rgb = hexToRgb(color.startsWith('#') && color.length === 7 ? color : '#14b8a6')
  const darkerColor = `rgb(${Math.max(0, rgb.r - 25)}, ${Math.max(0, rgb.g - 25)}, ${Math.max(0, rgb.b - 25)})`

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Color preview banner */}
      <div
        className="h-2 w-full transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${color}, ${darkerColor})` }}
      />

      <div className="p-6 flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Site Logo</label>
          <div className="flex items-center gap-4">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            <div
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-teal-300 transition-colors shrink-0"
              onClick={() => !uploading && inputRef.current?.click()}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Brand logo" className="w-full h-full object-contain p-1" />
              ) : uploading ? (
                <Loader size={20} className="text-gray-300 animate-spin" />
              ) : (
                <Upload size={20} className="text-gray-300" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                Shown on public pages and admin header.<br />PNG, JPG, WebP or SVG. Recommended: square.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-medium text-teal-500 hover:text-teal-600 border border-teal-200 hover:border-teal-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={handleLogoRemove}
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
        </div>

        <div className="border-t border-gray-100" />

        {/* Site name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Site Name</label>
          <p className="text-xs text-gray-400">Shown in browser tabs, emails, and the admin header.</p>
          <input
            type="text"
            value={siteName}
            onChange={e => { setSiteName(e.target.value); setSaved(false) }}
            placeholder="SiteFlo"
            className={inp}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* Brand color */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Brand Color</label>
          <p className="text-xs text-gray-400">Used on buttons, badges, and highlights across public pages.</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={color}
                onChange={e => { setColor(e.target.value); setSaved(false) }}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
              />
            </div>
            <input
              type="text"
              value={color}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) { setColor(e.target.value); setSaved(false) } }}
              placeholder="#14b8a6"
              className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:border-teal-400"
            />
            <button
              onClick={() => { setColor('#14b8a6'); setSaved(false) }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              title="Reset to default"
            >
              <RefreshCw size={12} /> Reset
            </button>
            {/* Swatch previews */}
            <div className="flex gap-1.5 ml-2">
              {['#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#0f172a'].map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setSaved(false) }}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? '#111' : 'transparent' }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          style={{ backgroundColor: saved ? '#10b981' : color }}
        >
          {saved ? <><Check size={15} /> Saved!</> : saving ? 'Saving…' : <><Save size={15} /> Save Brand Settings</>}
        </button>
      </div>
    </div>
  )
}
