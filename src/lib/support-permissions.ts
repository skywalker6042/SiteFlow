export type SupportCap =
  // Organizations
  | 'view_orgs'
  | 'create_orgs'
  | 'edit_org_details'
  | 'manage_org_plan'
  | 'manage_org_status'
  | 'manage_org_billing'
  | 'manage_org_members'
  | 'delete_orgs'
  // Support & Setup
  | 'manage_tickets'
  | 'manage_setup_requests'
  // Platform
  | 'manage_pricing'
  | 'manage_site'
  | 'view_health'

export interface CapGroup {
  label: string
  caps: { key: SupportCap; label: string }[]
}

export const CAP_GROUPS: CapGroup[] = [
  {
    label: 'Organizations',
    caps: [
      { key: 'view_orgs',          label: 'View organization list & details' },
      { key: 'create_orgs',        label: 'Create new organizations' },
      { key: 'edit_org_details',   label: 'Edit org name & details' },
      { key: 'manage_org_plan',    label: 'Change plan (Trial / Core / Pro)' },
      { key: 'manage_org_status',  label: 'Change status (Active / Suspended)' },
      { key: 'manage_org_billing', label: 'Manage billing status & paid dates' },
      { key: 'manage_org_members', label: 'Add & remove org members' },
      { key: 'delete_orgs',        label: 'Delete organizations permanently' },
    ],
  },
  {
    label: 'Support & Setup',
    caps: [
      { key: 'manage_tickets',        label: 'View & reply to support tickets' },
      { key: 'manage_setup_requests', label: 'View & manage setup requests' },
    ],
  },
  {
    label: 'Platform',
    caps: [
      { key: 'manage_pricing', label: 'Manage pricing & plan features' },
      { key: 'manage_site',    label: 'Edit site content & branding' },
      { key: 'view_health',    label: 'View health dashboard' },
    ],
  },
]

export const DEFAULT_SUPPORT_CAPS: SupportCap[] = [
  'view_orgs',
  'manage_tickets',
  'manage_setup_requests',
]
