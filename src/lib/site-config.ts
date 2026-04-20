// Pure config — no DB imports. Safe for client components and edge runtime.

export type BrandSettings = {
  site_name:     string
  primary_color: string
  logo_url:      string | null
}

export const BRAND_DEFAULTS: BrandSettings = {
  site_name:     'SiteFlo',
  primary_color: '#14b8a6',
  logo_url:      null,
}

export const EDITABLE_PAGES = {
  pricing: {
    label: 'Pricing Page',
    sections: [
      // Hero
      { key: 'hero_badge',  label: 'Hero Badge',        type: 'input'    as const, default: 'EARLY ACCESS PRICING' },
      { key: 'hero_title',  label: 'Hero Title',         type: 'input'    as const, default: 'Simple pricing for serious business owners' },
      { key: 'hero_body',   label: 'Hero Description',   type: 'textarea' as const, default: 'Stay organized, impress customers, and track every job — without the complexity. Built for business owners who want results, not training sessions.' },
      { key: 'hero_note',   label: 'Hero Footer Note',   type: 'input'    as const, default: 'Pricing subject to change as new features are added.' },
      // Trial card
      { key: 'trial_desc',    label: 'Trial Card — Description', type: 'input' as const, default: 'Full access for 14 days. No credit card required.' },
      { key: 'trial_bullets', label: 'Trial Card — Bullets (one per line)', type: 'textarea' as const, default: '14-day full access\nAll Core features included\nNo limits during trial\nCancel anytime' },
      // Core card
      { key: 'core_badge',    label: 'Core Card — Early Access Badge',  type: 'input'    as const, default: 'EARLY ACCESS' },
      { key: 'core_tagline',  label: 'Core Card — Tagline',             type: 'input'    as const, default: 'Everything you need to run your jobs professionally.' },
      { key: 'core_features', label: 'Core Card — Features (one per line)', type: 'textarea' as const, default: 'Unlimited jobs & projects\nWorkers & crew management\nJob scheduling & calendar\nTask & phase tracking\nClient share page with photo uploads\nInvoice generation\nEmail support' },
      // Pro card
      { key: 'pro_tagline',  label: 'Pro Card — Tagline',              type: 'input'    as const, default: 'For growing operations that demand more power.' },
      { key: 'pro_features', label: 'Pro Card — Features (one per line)', type: 'textarea' as const, default: 'Everything in Core\nAdvanced activity logs\nWorker time clock\nE-signature on invoices\nChange order tracking\nPriority support\nEarly access to every new feature' },
      // Pro Setup section
      { key: 'setup_title', label: 'Pro Setup — Title',       type: 'input'    as const, default: 'Pro Setup' },
      { key: 'setup_badge', label: 'Pro Setup — Badge Text',  type: 'input'    as const, default: 'Done-For-You' },
      { key: 'setup_desc',  label: 'Pro Setup — Description', type: 'textarea' as const, default: 'We set up your entire account — workers, projects, schedule, and profile — so you can start immediately. No learning curve.' },
      { key: 'setup_features', label: 'Pro Setup — Includes (one per line)', type: 'textarea' as const, default: 'Workers and crews added for you\nProjects set up with phases & tasks\nSchedule configured\nCompany profile customized\nUp and running within 24 hours' },
      { key: 'setup_note',  label: 'Pro Setup — Footer Note', type: 'input'    as const, default: "We'll reach out within 1 business day" },
      // Trust section
      { key: 'trust_1_title', label: 'Trust Card 1 — Title', type: 'input'    as const, default: 'Built for contractors' },
      { key: 'trust_1_body',  label: 'Trust Card 1 — Body',  type: 'textarea' as const, default: 'Designed from the ground up for construction workflows — not generic project management.' },
      { key: 'trust_2_title', label: 'Trust Card 2 — Title', type: 'input'    as const, default: 'No training needed' },
      { key: 'trust_2_body',  label: 'Trust Card 2 — Body',  type: 'textarea' as const, default: 'Your crew can start the same day. Simple enough for the field, powerful enough for the office.' },
      { key: 'trust_3_title', label: 'Trust Card 3 — Title', type: 'input'    as const, default: 'Real support' },
      { key: 'trust_3_body',  label: 'Trust Card 3 — Body',  type: 'textarea' as const, default: 'Every support ticket goes to a real person. We actually read your feedback and build from it.' },
      // FAQ
      { key: 'faq_1_q', label: 'FAQ 1 — Question', type: 'input'    as const, default: 'Do I need a credit card to start?' },
      { key: 'faq_1_a', label: 'FAQ 1 — Answer',   type: 'textarea' as const, default: 'No. The free trial requires no payment information. You get full access to explore everything before deciding.' },
      { key: 'faq_2_q', label: 'FAQ 2 — Question', type: 'input'    as const, default: 'Can I cancel anytime?' },
      { key: 'faq_2_a', label: 'FAQ 2 — Answer',   type: 'textarea' as const, default: 'Yes, absolutely. No long-term contracts. Cancel whenever — no questions asked.' },
      { key: 'faq_3_q', label: 'FAQ 3 — Question', type: 'input'    as const, default: 'How do I activate a paid plan?' },
      { key: 'faq_3_a', label: 'FAQ 3 — Answer',   type: 'textarea' as const, default: "During early access, contact us through the support page and we'll get you set up directly." },
      { key: 'faq_4_q', label: 'FAQ 4 — Question', type: 'input'    as const, default: 'What happens when my trial ends?' },
      { key: 'faq_4_a', label: 'FAQ 4 — Answer',   type: 'textarea' as const, default: 'Your account is suspended until you activate a plan. All your data is preserved — nothing is deleted.' },
      { key: 'faq_5_q', label: 'FAQ 5 — Question', type: 'input'    as const, default: 'What does the Pro Setup include?' },
      { key: 'faq_5_a', label: 'FAQ 5 — Answer',   type: 'textarea' as const, default: 'We manually configure your entire account: add workers, create your jobs and tasks, set up your schedule, and customize your profile — so you can use SiteFlo from day one.' },
      // Bottom CTA + footer
      { key: 'cta_title',   label: 'Bottom CTA Title',   type: 'input'    as const, default: 'Ready to take control of your jobs?' },
      { key: 'cta_body',    label: 'Bottom CTA Text',    type: 'textarea' as const, default: 'Join contractors already using SiteFlo to stay organized and impress their clients.' },
      { key: 'footer_text', label: 'Footer Text',        type: 'input'    as const, default: 'Powered by SiteFlo · Built for the trades' },
    ],
  },
  login: {
    label: 'Login Page',
    sections: [
      { key: 'tagline',      label: 'Tagline Under Logo',    type: 'input' as const, default: 'Job Management for Contractors' },
      { key: 'signin_title', label: 'Sign In Card Title',    type: 'input' as const, default: 'Sign in' },
      { key: 'no_account',   label: '"No account?" Text',    type: 'input' as const, default: "Don't have an account?" },
    ],
  },
  getstarted: {
    label: 'Get Started Page',
    sections: [
      { key: 'badge',    label: 'Badge Text',      type: 'input'    as const, default: 'GET STARTED' },
      { key: 'title',    label: 'Hero Title',       type: 'input'    as const, default: 'Start your free trial' },
      { key: 'body',     label: 'Hero Description', type: 'textarea' as const, default: "Tell us a bit about yourself and we'll get your account set up — usually within 1 business day." },
    ],
  },
} as const

export type PageKey = keyof typeof EDITABLE_PAGES
