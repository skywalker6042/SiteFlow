export function SiteFloWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-white">Site</span>
      <span
        className="font-bold"
        style={{
          background: 'linear-gradient(135deg, #5eead4, #38bdf8, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Flo
      </span>
    </span>
  )
}
