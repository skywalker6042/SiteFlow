import type { JobPhase, JobTask } from '@/types'

/**
 * Compute job completion from phases (simple count).
 * Returns 0 if no phases (caller falls back to job.percent_complete).
 */
export function calcProgress(phases: JobPhase[]): number {
  if (phases.length === 0) return 0
  const done = phases.filter((p) => p.status === 'done').length
  return Math.round((done / phases.length) * 100)
}

/**
 * Compute job completion from tasks.
 * Uses weights if any task has a weight set, otherwise simple count.
 */
export function calcTaskProgress(tasks: JobTask[]): number {
  if (tasks.length === 0) return 0
  const hasWeights = tasks.some((t) => t.weight !== null)
  if (hasWeights) {
    const total = tasks.reduce((s, t) => s + Number(t.weight ?? 1), 0)
    const done  = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + Number(t.weight ?? 1), 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  }
  const done = tasks.filter((t) => t.status === 'done').length
  return Math.round((done / tasks.length) * 100)
}

/**
 * Determine overall progress with full priority chain:
 *  tasks (if any) > phases (if any) > manual percent_complete
 * If jobStatus is 'done', always returns 100.
 */
export function calcOverallProgress(
  tasks: JobTask[],
  phases: JobPhase[],
  manualPct: number,
  jobStatus?: string
): number {
  if (jobStatus === 'done') return 100
  if (tasks.length > 0) return calcTaskProgress(tasks)
  if (phases.length > 0) return calcProgress(phases)
  return manualPct
}

/**
 * Toggle phase: anything that isn't done → done, done → not_started
 */
export function nextStatus(current: JobPhase['status']): JobPhase['status'] {
  return current === 'done' ? 'not_started' : 'done'
}
