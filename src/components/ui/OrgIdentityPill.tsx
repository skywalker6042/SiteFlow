'use client'

export type OrgIdentityPillProps = {
  name: string
  logoUrl?: string | null
  subtitle?: string
  accentColor?: string
  size?: 'sm' | 'md'
}

/** Deterministic gradient from org name — same name always gets same gradient */
function nameToGradient(name: string): { from: string; to: string; accent: string } {
  const palettes = [
    { from: '#f97316', to: '#ea580c', accent: '#f97316' }, // teal
    { from: '#8b5cf6', to: '#7c3aed', accent: '#8b5cf6' }, // violet
    { from: '#06b6d4', to: '#0891b2', accent: '#06b6d4' }, // cyan
    { from: '#10b981', to: '#059669', accent: '#10b981' }, // emerald
    { from: '#3b82f6', to: '#2563eb', accent: '#3b82f6' }, // blue
    { from: '#f43f5e', to: '#e11d48', accent: '#f43f5e' }, // rose
    { from: '#d97706', to: '#b45309', accent: '#d97706' }, // amber
    { from: '#6366f1', to: '#4f46e5', accent: '#6366f1' }, // indigo
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function OrgIdentityPill({
  name,
  logoUrl,
  subtitle = 'General Contractor',
  accentColor,
  size = 'md',
}: OrgIdentityPillProps) {
  const palette = nameToGradient(name)
  const accent  = accentColor ?? palette.accent
  const initials = getInitials(name)

  const avatarSize  = size === 'sm' ? 'w-8 h-8'   : 'w-10 h-10'
  const nameSize    = size === 'sm' ? 'text-sm'    : 'text-sm'
  const subSize     = size === 'sm' ? 'text-[10px]': 'text-xs'

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Avatar */}
      <div
        className={`${avatarSize} rounded-full flex-shrink-0 flex items-center justify-center relative`}
        style={{
          boxShadow: `0 0 0 2px rgba(255,255,255,0.15), 0 0 0 4px ${accent}55`,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
          >
            <span
              className="font-bold text-white leading-none select-none"
              style={{ fontSize: size === 'sm' ? '11px' : '13px' }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={`${nameSize} font-semibold text-white leading-tight truncate`}>{name}</p>
        <p className={`${subSize} text-gray-400 leading-tight truncate mt-0.5`}>{subtitle}</p>
      </div>
    </div>
  )
}
