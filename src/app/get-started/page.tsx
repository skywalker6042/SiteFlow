import Link from 'next/link'
import { GetStartedForm } from '@/components/auth/GetStartedForm'
import { getBrandSettings, getContentBlocks, resolveContent } from '@/lib/site-content'

export const dynamic = 'force-dynamic'

export default async function GetStartedPage() {
  const [brand, rawContent] = await Promise.all([
    getBrandSettings(),
    getContentBlocks('getstarted'),
  ])
  const c       = resolveContent('getstarted', rawContent)
  const color   = brand.primary_color
  const logoUrl = brand.logo_url ?? '/logo-512.png'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/pricing" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={brand.site_name} width={24} height={24} />
          <span className="font-bold text-gray-900">{brand.site_name}</span>
        </Link>
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Already have an account? Sign in →
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
              {c.badge}
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900">{c.title}</h1>
            <p className="text-sm text-gray-500 leading-relaxed">{c.body}</p>
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
