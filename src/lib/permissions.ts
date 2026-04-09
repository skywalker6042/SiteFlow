// Client-safe permission types and constants (no server imports)

export type UserPermissions = {
  // Jobs
  can_view_jobs:             boolean
  can_edit_jobs:             boolean
  can_view_job_financials:   boolean
  // Schedule
  can_view_schedule:         boolean
  can_manage_schedule:       boolean
  // Crew
  can_view_crew:             boolean
  // Financials / Reports
  can_view_financials:       boolean
  // Activity
  can_view_activity:         boolean
  // Photos
  can_upload_photos:         boolean
  // Tasks
  can_view_tasks:            boolean
  can_complete_tasks:        boolean
  can_manage_tasks:          boolean
  // Change Orders
  can_view_change_orders:    boolean
  can_manage_change_orders:  boolean
  // General
  can_view_all_jobs:         boolean
}

export const DEFAULT_WORKER_PERMISSIONS: UserPermissions = {
  can_view_jobs:            true,
  can_edit_jobs:            false,
  can_view_job_financials:  false,
  can_view_schedule:        true,
  can_manage_schedule:      false,
  can_view_crew:            false,
  can_view_financials:      false,
  can_view_activity:        false,
  can_upload_photos:        true,
  can_view_tasks:           true,
  can_complete_tasks:       true,
  can_manage_tasks:         false,
  can_view_change_orders:   false,
  can_manage_change_orders: false,
  can_view_all_jobs:        false,
}

export const LEAD_CREW_PERMISSIONS: UserPermissions = {
  can_view_jobs:            true,
  can_edit_jobs:            false,
  can_view_job_financials:  false,
  can_view_schedule:        true,
  can_manage_schedule:      true,
  can_view_crew:            true,
  can_view_financials:      false,
  can_view_activity:        true,
  can_upload_photos:        true,
  can_view_tasks:           true,
  can_complete_tasks:       true,
  can_manage_tasks:         true,
  can_view_change_orders:   true,
  can_manage_change_orders: false,
  can_view_all_jobs:        true,
}

export const BASIC_CREW_PERMISSIONS: UserPermissions = {
  can_view_jobs:            true,
  can_edit_jobs:            false,
  can_view_job_financials:  false,
  can_view_schedule:        true,
  can_manage_schedule:      false,
  can_view_crew:            false,
  can_view_financials:      false,
  can_view_activity:        false,
  can_upload_photos:        true,
  can_view_tasks:           true,
  can_complete_tasks:       true,
  can_manage_tasks:         false,
  can_view_change_orders:   false,
  can_manage_change_orders: false,
  can_view_all_jobs:        false,
}
