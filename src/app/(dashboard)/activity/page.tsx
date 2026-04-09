import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const orgId = await getOrgId()

  const logs = await sql`
    SELECT * FROM activity_logs
    WHERE company_id = ${orgId}
    ORDER BY created_at DESC
    LIMIT 100
  `

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-gray-400" />
        <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
      </div>
      <ActivityFeed logs={logs as any[]} showJobName />
    </div>
  )
}
