import Link from 'next/link'
import { HardHat } from 'lucide-react'
import { GetStartedForm } from '@/components/auth/GetStartedForm'

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/pricing" className="flex items-center gap-2">
          <HardHat size={20} className="text-orange-500" />
          <span className="font-bold text-gray-900">SiteFlow</span>
        </Link>
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Already have an account? Sign in →
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Get Started</span>
            <h1 className="text-2xl font-extrabold text-gray-900">Start your free trial</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tell us a bit about yourself and we'll get your account set up — usually within 1 business day.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <GetStartedForm />
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">View pricing</Link>
            <span>·</span>
            <Link href="/setup-request" className="hover:text-gray-600 transition-colors">Need done-for-you setup?</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
