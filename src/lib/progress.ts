import sql from '@/lib/db'

/**
 * Recomputes percent_complete on a job after any task or phase change.
 * Priority: tasks (weighted if any have weights, else simple) > phases > leave manual value
 */
export async function syncJobProgress(jobId: string, orgId: string): Promise<void> {
  const tasks = await sql`
    SELECT status, weight FROM job_tasks
    WHERE job_id = ${jobId} AND company_id = ${orgId}
  `

  if (tasks.length > 0) {
    const hasWeights = tasks.some((t) => t.weight !== null)
    let pct: number
    if (hasWeights) {
      const total = tasks.reduce((s: number, t) => s + Number(t.weight ?? 1), 0)
      const done  = tasks.filter((t) => t.status === 'done').reduce((s: number, t) => s + Number(t.weight ?? 1), 0)
      pct = total > 0 ? Math.round((done / total) * 100) : 0
    } else {
      const done = tasks.filter((t) => t.status === 'done').length
      pct = Math.round((done / tasks.length) * 100)
    }
    await sql`UPDATE jobs SET percent_complete = ${pct} WHERE id = ${jobId} AND company_id = ${orgId}`
    return
  }

  const phases = await sql`
    SELECT status FROM job_phases WHERE job_id = ${jobId} AND company_id = ${orgId}
  `
  if (phases.length > 0) {
    const done = phases.filter((p) => p.status === 'done').length
    const pct  = Math.round((done / phases.length) * 100)
    await sql`UPDATE jobs SET percent_complete = ${pct} WHERE id = ${jobId} AND company_id = ${orgId}`
  }
}
