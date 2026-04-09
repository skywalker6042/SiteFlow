export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Not Started',
    planned:     'Planned',
    in_progress: 'In Progress',
    done:        'Done',
  }
  return map[status] ?? status
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    planned:     'bg-purple-100 text-purple-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done:        'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}
