import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { statusLabel, statusColor } from '@/lib/utils'
import { calcOverallProgress } from '@/lib/phases'
import { MapPin, Phone, CheckSquare, Calendar, Image as ImageIcon, FileText, ArrowRight } from 'lucide-react'
import { ClientPhotoUpload } from '@/components/share/ClientPhotoUpload'
import type { JobPhase, JobTask } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ invoice?: string }>
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { token }   = await params
  const { invoice } = await searchParams
  const showInvoice = invoice === '1'

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT`

  const [job] = await sql`
    SELECT j.*, o.name AS org_name, o.logo_url AS org_logo, o.phone AS org_phone
    FROM jobs j
    JOIN organizations o ON o.id = j.company_id
    WHERE j.share_token = ${token}
  `
  if (!job) notFound()

  const [phases, tasks, photos, workDays, changeOrders, clientPhotos] = await Promise.all([
    sql`SELECT * FROM job_phases WHERE job_id = ${job.id} ORDER BY order_index ASC`,
    sql`SELECT * FROM job_tasks  WHERE job_id = ${job.id} ORDER BY order_index ASC, created_at ASC`,
    sql`SELECT * FROM job_photos WHERE job_id = ${job.id} AND (source IS NULL OR source = 'internal') ORDER BY created_at DESC LIMIT 12`,
    sql`
      SELECT wd.date, wd.status,
        COALESCE(json_agg(w.name ORDER BY w.name) FILTER (WHERE w.id IS NOT NULL), '[]') AS crew_names
      FROM work_days wd
      LEFT JOIN work_day_workers wdw ON wdw.work_day_id = wd.id
      LEFT JOIN workers w ON w.id = wdw.worker_id
      WHERE wd.job_id = ${job.id}
      GROUP BY wd.id
      ORDER BY wd.date DESC
      LIMIT 10
    `,
    Promise.resolve([]),
    sql`ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'`.then(() =>
      sql`SELECT * FROM job_photos WHERE job_id = ${job.id} AND source = 'client' ORDER BY created_at DESC`
    ),
  ])

  const progress   = calcOverallProgress(tasks as unknown as JobTask[], phases as unknown as JobPhase[], Number(job.percent_complete))
  const doneTasks  = (tasks as any[]).filter((t) => t.status === 'done').length
  const donePhases = (phases as any[]).filter((p) => p.status === 'done').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          {job.org_logo && (
            <img
              src={job.org_logo}
              alt={job.org_name}
              className="h-10 w-10 object-contain rounded-lg border border-gray-100 bg-gray-50 shrink-0"
            />
          )}
          <p className="text-sm font-semibold text-gray-700">{job.org_name}</p>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{job.name}</h1>
        {job.address && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <MapPin size={13} /> {job.address}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Status + Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Badge className={statusColor(job.status)}>{statusLabel(job.status)}</Badge>
            <span className="text-sm font-semibold text-gray-700">{progress}% complete</span>
          </div>
          <ProgressBar value={progress} showLabel={false} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            {tasks.length > 0 && <span>{doneTasks}/{tasks.length} tasks done</span>}
            {tasks.length === 0 && phases.length > 0 && <span>{donePhases}/{phases.length} phases done</span>}
            {job.planned_start && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {job.planned_start}{job.planned_end ? ` → ${job.planned_end}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Scope */}
        {job.scope && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Scope of Work</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{job.scope}</p>
          </div>
        )}

        {/* Tasks / Phases */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <CheckSquare size={15} className="text-gray-400" /> Tasks
            </h2>
            <div className="flex flex-col gap-2">
              {(tasks as any[]).map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    t.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {t.status === 'done' && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                  </div>
                  <span className={`text-sm ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && phases.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Phases</h2>
            <div className="flex flex-col gap-2">
              {(phases as any[]).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${p.status === 'done' ? 'text-gray-400' : 'text-gray-700'}`}>{p.name}</span>
                  <Badge className={p.status === 'done' ? 'bg-green-100 text-green-700' : p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}>
                    {p.status === 'done' ? 'Done' : p.status === 'in_progress' ? 'In progress' : 'Upcoming'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent work days */}
        {workDays.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Calendar size={15} className="text-gray-400" /> Schedule
            </h2>
            <div className="flex flex-col gap-2">
              {(workDays as any[]).map((wd, i) => {
                const crew: string[] = Array.isArray(wd.crew_names) ? wd.crew_names : []
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{String(wd.date)}</span>
                    <span className="text-gray-400 text-xs">{crew.length > 0 ? crew.join(', ') : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <ImageIcon size={15} className="text-gray-400" /> Photos
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(photos as any[]).map((photo) => (
                <a key={photo.id} href={photo.storage_path} target="_blank" rel="noreferrer">
                  <img
                    src={photo.storage_path}
                    alt={photo.caption || 'Job photo'}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-100"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Invoice link card */}
        {showInvoice && (
          <a
            href={`/share/${token}/invoice`}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-teal-300 hover:bg-teal-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-teal-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">View Invoice</p>
                <p className="text-xs text-gray-400 mt-0.5">Tap to open your invoice</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-teal-400 transition-colors" />
          </a>
        )}

        {/* Client photo upload */}
        <ClientPhotoUpload
          token={token}
          initialPhotos={(clientPhotos as any[]).map(p => ({ id: p.id, storage_path: p.storage_path }))}
        />

        {/* Contact */}
        {job.org_phone && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">{job.org_name}</span>
            <a href={`tel:${job.org_phone}`} className="flex items-center gap-1.5 text-sm text-teal-500 font-medium">
              <Phone size={14} /> {job.org_phone}
            </a>
          </div>
        )}

        <p className="text-xs text-gray-300 text-center">Powered by SiteFlo</p>
      </div>
    </div>
  )
}
