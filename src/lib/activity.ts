import sql from '@/lib/db'

export type EntityType =
  | 'job'
  | 'work_day'
  | 'task'
  | 'phase'
  | 'worker'
  | 'change_order'
  | 'financial'

/**
 * Fire-and-forget activity logger.
 * Never throws — logging must never fail a primary operation.
 */
export async function logActivity({
  orgId,
  actorEmail,
  entityType,
  entityId,
  entityName,
  action,
  metadata,
}: {
  orgId: string
  actorEmail?: string | null
  entityType: EntityType
  entityId?: string | null
  entityName?: string | null
  action: string
  metadata?: Record<string, unknown>
}) {
  try {
    await sql`
      INSERT INTO activity_logs
        (company_id, actor_email, entity_type, entity_id, entity_name, action, metadata)
      VALUES (
        ${orgId},
        ${actorEmail ?? null},
        ${entityType},
        ${entityId ?? null},
        ${entityName ?? null},
        ${action},
        ${metadata ? sql.json(metadata as Parameters<typeof sql.json>[0]) : null}
      )
    `
  } catch (err) {
    console.error('[activity-log] failed to write:', err)
  }
}
