import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/auth-context'
import sql from '@/lib/db'
import os from 'os'
import { execSync } from 'child_process'
import { readdirSync, statSync } from 'fs'
import path from 'path'

function getDiskUsage() {
  try {
    const out = execSync('df -k .', { encoding: 'utf8' })
    const line = out.trim().split('\n')[1].trim().split(/\s+/)
    const total = parseInt(line[1]) * 1024
    const used  = parseInt(line[2]) * 1024
    return { total, used, free: total - used }
  } catch {
    return null
  }
}

function getPhotoStats() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    let fileCount = 0
    let totalBytes = 0

    const jobDirs = readdirSync(uploadsDir)
    for (const dir of jobDirs) {
      const dirPath = path.join(uploadsDir, dir)
      try {
        const files = readdirSync(dirPath)
        for (const file of files) {
          const s = statSync(path.join(dirPath, file))
          if (s.isFile()) { fileCount++; totalBytes += s.size }
        }
      } catch {}
    }
    return { fileCount, totalBytes }
  } catch {
    return { fileCount: 0, totalBytes: 0 }
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (session.user.platformRole !== 'admin') return forbidden()

  // Database ping
  const dbStart = Date.now()
  let dbStatus = 'ok'
  let dbMs = 0
  try {
    await sql`SELECT 1`
    dbMs = Date.now() - dbStart
  } catch {
    dbStatus = 'error'
  }

  // DB counts
  const [counts] = await sql`
    SELECT
      (SELECT COUNT(*) FROM organizations)          AS org_count,
      (SELECT COUNT(*) FROM users)                  AS user_count,
      (SELECT COUNT(*) FROM jobs)                   AS job_count,
      (SELECT COUNT(*) FROM jobs WHERE status='done') AS done_job_count,
      (SELECT COUNT(*) FROM job_photos)             AS photo_count,
      (SELECT COUNT(*) FROM support_tickets)        AS ticket_count,
      (SELECT COUNT(*) FROM support_tickets WHERE status != 'closed') AS open_ticket_count
  `

  // Recent errors from activity log (last 10 entries)
  const recentActivity = await sql`
    SELECT actor_email, entity_type, entity_name, action, created_at
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT 8
  `

  // System info
  const loadAvg   = os.loadavg()
  const totalMem  = os.totalmem()
  const freeMem   = os.freemem()
  const usedMem   = totalMem - freeMem
  const cpuCount  = os.cpus().length
  const disk      = getDiskUsage()
  const photos    = getPhotoStats()

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    app: {
      status:      'ok',
      uptime:      process.uptime(),
      nodeVersion: process.version,
      env:         process.env.NODE_ENV ?? 'production',
      memoryUsed:  process.memoryUsage().rss,
    },
    database: {
      status: dbStatus,
      responseMs: dbMs,
      counts: {
        orgs:        Number(counts.org_count),
        users:       Number(counts.user_count),
        jobs:        Number(counts.job_count),
        doneJobs:    Number(counts.done_job_count),
        photos:      Number(counts.photo_count),
        tickets:     Number(counts.ticket_count),
        openTickets: Number(counts.open_ticket_count),
      },
    },
    system: {
      platform:   os.platform(),
      cpuCores:   cpuCount,
      loadAvg1:   loadAvg[0],
      loadAvg5:   loadAvg[1],
      loadAvg15:  loadAvg[2],
      totalMemory: totalMem,
      usedMemory:  usedMem,
      freeMemory:  freeMem,
      disk,
    },
    storage: photos,
    recentActivity,
  })
}
