import Link from 'next/link'
import { Check, Zap, ArrowRight, Wrench } from 'lucide-react'
import { getPricing } from '@/app/api/admin/pricing/route'
import { getBrandSettings, getContentBlocks, resolveContent } from '@/lib/site-content'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const [pricing, brand, rawContent] = await Promise.all([
    getPricing(),
    getBrandSettings(),
    getContentBlocks('pricing'),
  ])

  const c        = resolveContent('pricing', rawContent)
  const color    = brand.primary_color
  const siteName = brand.site_name
  const logoUrl  = brand.logo_url ?? '/logo-512.png'

  const trialDays  = pricing.price_trial_days ?? '14'
  const priceCore  = pricing.price_core       ?? '39'
  const pricePro   = pricing.price_pro        ?? '79'
  const priceSetup = pricing.price_setup      ?? '699'

  // Parse newline-separated lists
  const lines = (val: string) => val.split('\n').map(s => s.trim()).filter(Boolean)

  const trialBullets  = lines(c.trial_bullets)
  const coreFeatures  = lines(c.core_features)
  const proFeatures   = lines(c.pro_features)
  const setupFeatures = lines(c.setup_features)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={siteName} width={24} height={24} />
          <span className="font-bold text-gray-900">{siteName}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Sign in</Link>
          <Link
            href="/get-started"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: color }}
          >
            Start free trial
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-16">

        {/* Hero */}
        <div className="text-center max-w-xl flex flex-col gap-4">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full tracking-wide self-center text-white"
            style={{ backgroundColor: color }}
          >
            {c.hero_badge}
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
            {c.hero_title}
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">{c.hero_body}</p>
          <p className="text-xs text-gray-400 italic">{c.hero_note}</p>
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
              <p className="text-sm text-gray-500 mt-1.5">{c.trial_desc}</p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {trialBullets.map(f => (
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
          <div className="bg-white rounded-2xl border-2 p-6 flex flex-col gap-5 relative shadow-lg" style={{ borderColor: color }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs font-bold text-white px-3 py-1 rounded-full tracking-wide whitespace-nowrap" style={{ backgroundColor: color }}>
                {c.core_badge}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color }}>Core</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-gray-900">${priceCore}</span>
                <span className="text-sm text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-1.5">{c.core_tagline}</p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {coreFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/get-started"
              className="w-full text-center text-sm font-bold text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: color }}
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Pro</p>
                <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-semibold">Coming Soon</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-white">${pricePro}</span>
                <span className="text-sm text-gray-400 mb-1">/month</span>
              </div>
              <p className="text-sm text-gray-400 mt-1.5">{c.pro_tagline}</p>
            </div>
            <ul className="flex flex-col gap-2.5 flex-1">
              {proFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <Zap size={15} className="text-teal-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/support" className="w-full text-center text-sm font-semibold bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-colors">
              Request Early Access
            </Link>
          </div>
        </div>

        {/* Pro Setup */}
        <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '33' }}>
                <Wrench size={16} style={{ color }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{c.setup_badge}</span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1">{c.setup_title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{c.setup_desc}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {setupFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check size={14} className="shrink-0" style={{ color }} />
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
              className="flex items-center gap-2 text-white font-bold text-sm px-7 py-3.5 rounded-xl transition-colors whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              Request Setup <ArrowRight size={15} />
            </Link>
            <p className="text-xs text-gray-500">{c.setup_note}</p>
          </div>
        </div>

        {/* Trust */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { title: c.trust_1_title, body: c.trust_1_body },
            { title: c.trust_2_title, body: c.trust_2_body },
            { title: c.trust_3_title, body: c.trust_3_body },
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
            { q: c.faq_1_q, a: c.faq_1_a },
            { q: c.faq_2_q, a: c.faq_2_a },
            { q: c.faq_3_q, a: c.faq_3_a },
            { q: c.faq_4_q, a: c.faq_4_a },
            { q: c.faq_5_q, a: c.faq_5_a },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full max-w-xl rounded-2xl p-8 text-center flex flex-col gap-4 text-white" style={{ backgroundColor: color }}>
          <p className="text-xl font-extrabold">{c.cta_title}</p>
          <p className="text-sm opacity-80">{c.cta_body}</p>
          <Link
            href="/get-started"
            className="bg-white font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity self-center"
            style={{ color }}
          >
            Start Free — No Credit Card
          </Link>
        </div>

        <p className="text-xs text-gray-300 text-center">{c.footer_text}</p>
      </main>
    </div>
  )
}
