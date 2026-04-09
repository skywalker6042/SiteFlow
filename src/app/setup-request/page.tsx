import Link from 'next/link'
import { HardHat, Shield, Clock, Users } from 'lucide-react'
import { SetupRequestForm } from '@/components/setup/SetupRequestForm'

export default function SetupRequestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <HardHat size={20} className="text-orange-500" />
          <span className="font-bold text-gray-900">SiteFlow</span>
        </Link>
        <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Back to pricing
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-5 gap-12">

        {/* Left — pitch */}
        <div className="md:col-span-2 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Done-For-You Setup</span>
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              We'll set everything up so you can hit the ground running.
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tell us about your business and we'll handle the entire setup — workers, projects, schedule, and profile — so you can start using SiteFlow immediately.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { icon: Users,  title: 'Workers & crews added', body: 'We add your team members and assign their roles.' },
              { icon: HardHat, title: 'Projects configured',  body: 'Your current jobs are set up with phases and tasks.' },
              { icon: Clock,   title: 'Ready within 24 hrs',  body: 'Most setups are completed within 1 business day.' },
              { icon: Shield,  title: 'Nothing to figure out', body: 'We handle the configuration — you just log in and go.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-800 leading-relaxed">
            "We'll handle everything for you so you can focus on your business."
          </div>
        </div>

        {/* Right — form */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Request Your Setup</h2>
                <p className="text-xs text-gray-400 mt-0.5">Takes about 2 minutes to fill out.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-900">$299</p>
                <p className="text-xs text-gray-400">one-time</p>
              </div>
            </div>
            <SetupRequestForm />
          </div>
        </div>

      </main>
    </div>
  )
}
