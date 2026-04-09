interface ProgressBarProps {
  value: number
  showLabel?: boolean
}

export function ProgressBar({ value, showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const color =
    pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-500' : 'bg-orange-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
      )}
    </div>
  )
}
