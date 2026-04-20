import sql from '@/lib/db'
export type { BrandSettings, PageKey } from '@/lib/site-config'
export { BRAND_DEFAULTS, EDITABLE_PAGES } from '@/lib/site-config'
import { BRAND_DEFAULTS, EDITABLE_PAGES, type BrandSettings, type PageKey } from '@/lib/site-config'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function getBrandSettings(): Promise<BrandSettings> {
  await ensureTable()
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE 'brand_%'` as any[]
  const settings: BrandSettings = { ...BRAND_DEFAULTS }
  for (const row of rows) {
    const k = row.key.replace('brand_', '') as keyof BrandSettings
    if (k in settings) (settings as any)[k] = row.value
  }
  return settings
}

export async function getContentBlocks(page: PageKey): Promise<Record<string, string>> {
  await ensureTable()
  const prefix = `content_${page}_`
  const pattern = prefix + '%'
  const rows = await sql`SELECT key, value FROM platform_settings WHERE key LIKE ${pattern}` as any[]
  const blocks: Record<string, string> = {}
  for (const row of rows) {
    blocks[row.key.slice(prefix.length)] = row.value
  }
  return blocks
}

/** Merge DB blocks with defaults so callers never get undefined */
export function resolveContent(page: PageKey, blocks: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const s of EDITABLE_PAGES[page].sections) {
    result[s.key] = blocks[s.key] ?? s.default
  }
  return result
}
