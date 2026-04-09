import Link from 'next/link'
import { Check, Zap, HardHat, ArrowRight, Wrench } from 'lucide-react'
import { getPricing } from '@/app/api/admin/pricing/route'

export const dynamic = 'force-dynamic'

const CORE_FEATURES = [
  'Unlimited jobs & projects',
  'Workers & crew management',
  'Job scheduling & calendar',
  'Task & phase tracking',
  'Client share page with photo uploads',
  'Invoice generation',
  'Email support',
]

const PRO_FEATURES = [
  'Everything in Core',
  'Advanced activity logs',
  'Worker time clock',
  'E-signature on invoices',
  'Change order tracking',
  'Priority support',
  'Early access to every new feature',
]

const SETUP_INCLUDES = [
  'Workers and crews added for you',
  'Projects set up with phases & tasks',
  'Schedule configured',
  'Company profile customized',
  'Up and running within 24 hours',
]

export default async function PricingPage() {
  const pricing = await getPricing()
  const trialDays = pricing.price_trial_days ?? '14'
  const priceCore = pricing.price_core  ?? '39'
  const pricePro  = pricing.price_pro   ?? '79'
  const priceSetup = pricing.price_setup ?? '299'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat size={20} className="text-orange-500" />
          <span className="font-bold text-gray-900">SiteFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Sign in</Link>
          <Link href="/get-started" className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
            Start free trial
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-16">

        {/* Hero */}
        <div className="text-center max-w-xl flex flex-col gap-4">
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full tracking-wide self-center">
            EARLY ACCESS PRICING
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
            Simple pricing for<br />serious contractors
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Stay organized, impress customers, and track every job — without the complexity.
            Built for contractors who want results, not training sessions.
          </p>
          <p className="text-xs text-gray-400 italic">
            Pricing subject to change as new features are added.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

          {/* Trial */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Free Trial</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-gray-900">Free</span>
              </div>
              <p className="text-sm text-gray-500 mt-1.5">
                Full access for {trialDays} days. No credit card required.
              </p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {[`${trialDays}-day full access`, 'All Core features included', 'No limits during trial', 'Cancel anytime'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/get-started"
              className="w-full text-center text-sm font-semibold border-2 border-gray-200 hover:border-gray-400 text-gray-700 py-3 rounded-xl transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Core */}
          <div className="bg-white rounded-2xl border-2 border-orange-400 p-6 flex flex-col gap-5 relative shadow-lg shadow-orange-100">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs font-bold bg-orange-500 text-white px-3 py-1 rounded-full tracking-wide whitespace-nowrap">EARLY ACCESS</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Core</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-gray-900">${priceCore}</span>
                <span className="text-sm text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-1.5">Everything you need to run your jobs professionally.</p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {CORE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={15} className="text-orange-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/get-started"
              className="w-full text-center text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Pro</p>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">Coming Soon</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-white">${pricePro}</span>
                <span className="text-sm text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 mt-1.5">For growing operations that demand more power.</p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <Zap size={15} className="text-orange-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/support"
              className="w-full text-center text-sm font-semibold bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-colors"
            >
              Request Early Access
            </Link>
          </div>
        </div>

        {/* Pro Setup */}
        <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Wrench size={16} className="text-orange-400" />
              </div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Done-For-You</span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1">Pro Setup</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                We set up your entire account — workers, projects, schedule, and profile — so you can start immediately. No learning curve.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {SETUP_INCLUDES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check size={14} className="text-orange-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4 shrink-0">
            <div className="text-center md:text-right">
              <p className="text-4xl font-extrabold text-white">${priceSetup}</p>
              <p className="text-sm text-gray-400 mt-0.5">one-time fee</p>
            </div>
            <Link
              href="/setup-request"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-orange-900/30 whitespace-nowrap"
            >
              Request Setup <ArrowRight size={15} />
            </Link>
            <p className="text-xs text-gray-500">We'll reach out within 1 business day</p>
          </div>
        </div>

        {/* Trust */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { title: 'Built for contractors', body: 'Designed from the ground up for construction workflows — not generic project management.' },
            { title: 'No training needed',    body: 'Your crew can start the same day. Simple enough for the field, powerful enough for the office.' },
            { title: 'Real support',          body: 'Every support ticket goes to a real person. We actually read your feedback and build from it.' },
          ].map(({ title, body }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-2">
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Common questions</h2>
          {[
            { q: 'Do I need a credit card to start?',  a: 'No. The free trial requires no payment information. You get full access to explore everything before deciding.' },
            { q: 'Can I cancel anytime?',              a: 'Yes, absolutely. No long-term contracts. Cancel whenever — no questions asked.' },
            { q: 'How do I activate a paid plan?',     a: 'During early access, contact us through the support page and we\'ll get you set up directly.' },
            { q: 'What happens when my trial ends?',   a: 'Your account is suspended until you activate a plan. All your data is preserved — nothing is deleted.' },
            { q: 'What does the Pro Setup include?',   a: 'We manually configure your entire account: add workers, create your jobs and tasks, set up your schedule, and customize your profile — so you can use SiteFlow from day one.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full max-w-xl bg-orange-500 rounded-2xl p-8 text-center flex flex-col gap-4 text-white">
          <p className="text-xl font-extrabold">Ready to take control of your jobs?</p>
          <p className="text-sm text-orange-100">Join contractors already using SiteFlow to stay organized and impress their clients.</p>
          <Link
            href="/get-started"
            className="bg-white text-orange-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors self-center"
          >
            Start Free — No Credit Card
          </Link>
        </div>

        <p className="text-xs text-gray-300 text-center">Powered by SiteFlow · Built for the trades</p>
      </main>
    </div>
  )
}
