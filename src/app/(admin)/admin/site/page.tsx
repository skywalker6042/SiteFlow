import { getBrandSettings, getContentBlocks, resolveContent, EDITABLE_PAGES, type PageKey } from '@/lib/site-content'
import { BrandEditor } from '@/components/admin/BrandEditor'
import { PageContentEditor } from '@/components/admin/PageContentEditor'

export const dynamic = 'force-dynamic'

export default async function AdminSitePage() {
  const [brand, ...contentResults] = await Promise.all([
    getBrandSettings(),
    ...( Object.keys(EDITABLE_PAGES) as PageKey[]).map(p => getContentBlocks(p)),
  ])

  const pages = Object.keys(EDITABLE_PAGES) as PageKey[]
  const initialContent = Object.fromEntries(
    pages.map((p, i) => [p, resolveContent(p, contentResults[i])])
  ) as Record<PageKey, Record<string, string>>

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      {/* Brand */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brand & Site Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Logo, site name, and brand color applied across all public pages.</p>
        </div>
        <BrandEditor initial={brand} />
      </div>

      {/* Page content */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Page Content</h2>
          <p className="text-sm text-gray-400 mt-0.5">Edit text on your public pages without touching code.</p>
        </div>
        <PageContentEditor initialContent={initialContent} />
      </div>
    </div>
  )
}
