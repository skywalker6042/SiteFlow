import sql from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/auth-context'
import { PlatformUserManager } from '@/components/admin/PlatformUserManager'
import { SupportPermissionsEditor } from '@/components/admin/SupportPermissionsEditor'
import { DEFAULT_SUPPORT_CAPS, type SupportCap } from '@/lib/support-permissions'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const user = await requirePlatformAdmin()

  const [users, settingsRows] = await Promise.all([
    sql`
      SELECT u.id, u.email, u.platform_role, u.created_at,
        o.name AS org_name
      FROM users u
      LEFT JOIN org_members om ON om.user_id = u.id
      LEFT JOIN organizations o ON o.id = om.org_id
      WHERE u.platform_role IN ('admin', 'support')
      ORDER BY u.platform_role ASC, u.email ASC
    `,
    sql`SELECT value FROM platform_settings WHERE key = 'support_capabilities'`.catch(() => []),
  ])

  const supportCaps: SupportCap[] = settingsRows[0]
    ? JSON.parse((settingsRows[0] as any).value)
    : DEFAULT_SUPPORT_CAPS

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Users</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage who has access to this admin panel and what they can do.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PlatformUserManager
          initialUsers={users as any}
          currentUserId={user.id}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Support Role Permissions</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Control which admin sections users with the Support role can access.
          </p>
        </div>
        <SupportPermissionsEditor initialCaps={supportCaps} />
      </div>
    </div>
  )
}
