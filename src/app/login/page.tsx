import { LoginForm } from '@/components/auth/LoginForm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-500">SiteFlow</h1>
          <p className="text-sm text-gray-500 mt-1">Job Management for Contractors</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Sign in</h2>
          <LoginForm />
        </div>
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
          <p>Don't have an account?</p>
          <div className="flex items-center gap-3">
            <Link href="/get-started" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Request Access
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/pricing" className="text-gray-500 hover:text-gray-800 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
