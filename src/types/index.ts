export type JobStatus    = 'not_started' | 'planned' | 'in_progress' | 'done'
export type PhaseStatus  = 'not_started' | 'in_progress' | 'done'
export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type WorkDayStatus = 'not_started' | 'planned' | 'in_progress' | 'done'

export interface Worker {
  id: string
  name: string
  phone: string | null
  role: string | null
  created_at: string
}

export interface Job {
  id: string
  name: string
  address: string | null
  scope: string | null
  status: JobStatus
  percent_complete: number
  total_value: number
  amount_billed: number
  amount_paid: number
  client_name: string | null
  client_phone: string | null
  planned_start: string | null
  planned_end: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface JobPhase {
  id: string
  job_id: string
  company_id: string
  name: string
  status: PhaseStatus
  order_index: number
  notes: string | null
  weight: number | null
  group_name: string | null
  estimated_hrs: number | null
  created_at: string
}

export interface JobTask {
  id: string
  job_id: string
  company_id: string
  phase_id: string | null
  name: string
  status: TaskStatus
  weight: number | null
  order_index: number
  notes: string | null
  billable: boolean
  created_at: string
}

export interface WorkDay {
  id: string
  job_id: string
  company_id: string
  crew_id: string | null
  date: string        // YYYY-MM-DD string (postgres.js date override)
  status: WorkDayStatus
  notes: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
}

export interface WorkDayWithJob extends WorkDay {
  job_name: string
  job_status: JobStatus
  workers: { id: string; name: string }[]
}

export interface WorkDayWithCrew extends WorkDay {
  workers: Worker[]
}

export interface WorkDayWorker {
  id: string
  work_day_id: string
  worker_id: string
  company_id: string
}

export interface JobWithCrew extends Job {
  workers: Worker[]
  change_orders: ChangeOrder[]
}

export interface JobWorker {
  id: string
  job_id: string
  worker_id: string
}

export interface ChangeOrder {
  id: string
  job_id: string
  description: string
  amount: number
  approved: boolean
  created_at: string
}

export interface Specialty {
  id: string
  company_id: string
  name: string
  created_at: string
}

export interface WorkerWithSpecialties extends Worker {
  specialties: { id: string; name: string }[]
}

export interface Team {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
}

export interface TeamWithMembers extends Team {
  members: Worker[]
}

export interface JobPhoto {
  id: string
  job_id: string
  storage_path: string
  caption: string | null
  created_at: string
}

export interface OrgRole {
  id: string
  org_id: string
  name: string
  color: string
  permissions: import('@/lib/permissions').UserPermissions
  created_at: string
}

// Legacy aliases kept for any remaining references
export type SessionStatus = WorkDayStatus
export type JobSession = WorkDay
export type JobSessionWithJob = WorkDayWithJob
export type JobSessionWithCrew = WorkDayWithCrew
export type SessionWorker = WorkDayWorker
