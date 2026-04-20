// Org-level plan tiers and the features each tier can enable

export type PlanTier = 'trial' | 'core' | 'pro'

export type FeatureKey =
  | 'backlog'
  | 'calendar'
  | 'crew'
  | 'financials'
  | 'activity'
  | 'time_clock'
  | 'change_orders'
  | 'photos'
  | 'invoices'
  | 'share_page'
  | 'receipt_tracking'

export const ALL_FEATURES: FeatureKey[] = [
  'backlog', 'calendar', 'crew', 'financials', 'activity',
  'time_clock', 'change_orders', 'photos', 'invoices', 'share_page',
  'receipt_tracking',
]

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  backlog:           'Backlog Board',
  calendar:          'Calendar & Scheduling',
  crew:              'Crew Management',
  financials:        'Financials & Reports',
  activity:          'Activity Feed',
  time_clock:        'Worker Time Clock',
  change_orders:     'Change Orders',
  photos:            'Photo Uploads',
  invoices:          'Invoice Generation',
  share_page:        'Client Share Page',
  receipt_tracking:  'Receipt Tracking (AI)',
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  trial: 'Trial',
  core:  'Core',
  pro:   'Pro',
}

// Defaults used when no DB config exists yet
export const DEFAULT_PLAN_FEATURES: Record<PlanTier, FeatureKey[]> = {
  trial: [
    'backlog', 'calendar', 'crew', 'financials', 'activity',
    'time_clock', 'change_orders', 'photos', 'invoices', 'share_page',
  ],
  core: [
    'backlog', 'calendar', 'crew', 'financials', 'activity',
    'change_orders', 'photos', 'invoices', 'share_page',
  ],
  pro: ALL_FEATURES, // receipt_tracking included
}
