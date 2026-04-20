import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { DEFAULT_SUPPORT_CAPS, type SupportCap } from '@/lib/support-permissions'

/**
 * Returns caps for the current admin/support user.
 * Platform admins get every cap. Support users get their configured caps.
 */
export async function getAdminCaps(): Promise<{ can: (cap: SupportCap) => boolean; isAdmin: boolean }> {
  const session = await auth()
  const isAdmin = session?.user?.platformRole === 'admin'

  if (isAdmin) {
    return { can: () => true, isAdmin: true }
  }

  let caps: SupportCap[] = DEFAULT_SUPPORT_CAPS
  try {
    const [row] = await sql`SELECT value FROM platform_settings WHERE key = 'support_capabilities'`
    if (row) caps = JSON.parse(row.value)
  } catch {}

  return { can: (cap) => caps.includes(cap), isAdmin: false }
}
