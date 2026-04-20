import { formatDistanceToNow } from 'date-fns'
import { Briefcase, Calendar, CheckSquare, FileText, DollarSign, User } from 'lucide-react'

interface Log {
  id: string
  entity_type: string
  entity_name: string | null
  action: string
  actor_email: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  job:          <Briefcase size={14} />,
  work_day:     <Calendar  size={14} />,
  task:         <CheckSquare size={14} />,
  phase:        <CheckSquare size={14} />,
  change_order: <FileText  size={14} />,
  financial:    <DollarSign size={14} />,
  worker:       <User       size={14} />,
}

const ENTITY_COLOR: Record<string, string> = {
  job:          'bg-blue-50 text-blue-500',
  work_day:     'bg-teal-50 text-teal-500',
  task:         'bg-green-50 text-green-500',
  phase:        'bg-purple-50 text-purple-500',
  change_order: 'bg-yellow-50 text-yellow-600',
  financial:    'bg-emerald-50 text-emerald-500',
  worker:       'bg-gray-100 text-gray-500',
}

function formatAction(log: Log): string {
  const name = log.entity_name ? `"${log.entity_name}"` : ''
  const meta = log.metadata ?? {}

  switch (log.action) {
    case 'created':              return `Created ${log.entity_type.replace('_', ' ')} ${name}`
    case 'deleted':              return `Deleted ${log.entity_type.replace('_', ' ')} ${name}`
    case 'updated':              return `Updated ${log.entity_type.replace('_', ' ')} ${name}`
    case 'completed':            return `Completed task ${name}`
    case 'scheduled':            return `Scheduled work day for ${name}${meta.date ? ` on ${meta.date}` : ''}`
    case 'approved':             return `Approved change order ${name}`
    case 'unapproved':           return `Revoked approval for ${name}`
    default:
      if (log.action.startsWith('status_changed_to_')) {
        const to = log.action.replace('status_changed_to_', '').replace('_', ' ')
        const label = log.entity_type === 'job' ? `Job ${name}` : `Work day for ${name}`
        return `${label} → ${to}`
      }
      return `${log.action} ${name}`
  }
}

export function ActivityFeed({ logs, showJobName = false }: { logs: Log[]; showJobName?: boolean }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-10 text-center">
        <p className="text-sm text-gray-400">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {logs.map((log, i) => (
        <div key={log.id} className={`flex gap-3 py-3 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ENTITY_COLOR[log.entity_type] ?? 'bg-gray-100 text-gray-400'}`}>
            {ENTITY_ICONS[log.entity_type] ?? <Briefcase size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-snug">{formatAction(log)}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
              {log.actor_email && <span>{log.actor_email.split('@')[0]}</span>}
              {log.actor_email && <span>·</span>}
              {showJobName && log.metadata && (log.metadata.job_name as string) && (
                <>
                  <span className="text-gray-500 font-medium">{log.metadata.job_name as string}</span>
                  <span>·</span>
                </>
              )}
              <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
