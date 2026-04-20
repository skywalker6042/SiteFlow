import { LoginForm } from '@/components/auth/LoginForm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getBrandSettings, getContentBlocks, resolveContent } from '@/lib/site-content'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    const role = session.user.platformRole
    redirect(role === 'admin' || role === 'support' ? '/admin' : '/dashboard')
  }

  const [brand, rawContent] = await Promise.all([
    getBrandSettings(),
    getContentBlocks('login'),
  ])
  const c       = resolveContent('login', rawContent)
  const color   = brand.primary_color
  const logoUrl = brand.logo_url ?? '/logo-512.png'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={brand.site_name} width={80} height={56} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-gray-900">{brand.site_name}</span>
            </h1>
            <div className="w-8 h-0.5 rounded-full mx-auto mt-2" style={{ backgroundColor: color }} />
            <p className="text-sm text-gray-500 mt-1">{c.tagline}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">{c.signin_title}</h2>
          <LoginForm />
        </div>
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
          <p>{c.no_account}</p>
          <div className="flex items-center gap-3">
            <Link
              href="/get-started"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color }}
            >
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
