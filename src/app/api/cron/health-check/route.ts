import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import sql from '@/lib/db'
import { sendAdminAlert } from '@/lib/email'

// Thresholds
const CPU_THRESHOLD_PCT    = 80   // % of total CPU cores
const MEMORY_THRESHOLD_PCT = 85   // % of total RAM
const DISK_THRESHOLD_PCT   = 85   // % of total disk
const PHOTO_THRESHOLD_GB   = 10   // GB of photo storage
const BACKUP_MAX_AGE_HOURS = 30   // backups should never be older than this
const COOLDOWN_MINUTES     = 60   // don't re-alert same issue within this window

// Run every 15 minutes:
// */15 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://siteflo.app/api/cron/health-check

function getDiskUsage() {
  try {
    const out  = execSync('df -k .', { encoding: 'utf8' })
    const line = out.trim().split('\n')[1].trim().split(/\s+/)
    const total = parseInt(line[1]) * 1024
    const used  = parseInt(line[2]) * 1024
    return { total, used, free: total - used, pct: (parseInt(line[2]) / parseInt(line[1])) * 100 }
  } catch { return null }
}

function getPhotoBytes() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    let total = 0
    for (const dir of readdirSync(uploadsDir)) {
      const dirPath = path.join(uploadsDir, dir)
      try {
        for (const file of readdirSync(dirPath)) {
          const s = statSync(path.join(dirPath, file))
          if (s.isFile()) total += s.size
        }
      } catch {}
    }
    return total
  } catch { return 0 }
}

type LatestBackupMetadata = {
  createdAt: string
  backupFile: string
  sizeBytes?: number
}

type ExpiredTrialRow = {
  name: string
  trial_ends_at: string | Date
}

function getLatestBackup(): LatestBackupMetadata | null {
  try {
    const latestPath = path.join(process.cwd(), 'backups', 'db', 'latest-backup.json')
    if (!existsSync(latestPath)) return null
    const raw = JSON.parse(readFileSync(latestPath, 'utf8')) as Partial<LatestBackupMetadata>
    if (!raw.createdAt || !raw.backupFile) return null
    return {
      createdAt: raw.createdAt,
      backupFile: raw.backupFile,
      sizeBytes: raw.sizeBytes,
    }
  } catch {
    return null
  }
}

async function isOnCooldown(key: string): Promise<boolean> {
  try {
    await sql`CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT)`
    const [row] = await sql`SELECT value FROM platform_settings WHERE key = ${key}`
    if (!row) return false
    const last = new Date(row.value).getTime()
    return Date.now() - last < COOLDOWN_MINUTES * 60 * 1000
  } catch { return false }
}

async function setCooldown(key: string) {
  await sql`
    INSERT INTO platform_settings (key, value) VALUES (${key}, ${new Date().toISOString()})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

function fmt(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`
}

function table(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:16px 0;">${rows}</table>`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const secret     = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const alerts: string[] = []

  // ── 1. Database connectivity ───────────────────────────────────────────────
  let dbOk = true
  let dbMs = 0
  try {
    const start = Date.now()
    await sql`SELECT 1`
    dbMs = Date.now() - start
  } catch {
    dbOk = false
  }

  if (!dbOk && !(await isOnCooldown('alert_db'))) {
    await sendAdminAlert(
      'Database Unreachable',
      '🔴',
      `<p style="font-size:15px;color:#991b1b;">The app cannot connect to PostgreSQL. All requests are failing.</p>
       <p style="font-size:14px;color:#6b7280;">Check that PostgreSQL is running and the DATABASE_URL in .env.local is correct.</p>`
    )
    await setCooldown('alert_db')
    alerts.push('db_down')
  }

  // If DB is down we can't check anything else reliably
  if (!dbOk) return NextResponse.json({ alerts, dbOk })

  // ── 2. CPU load ───────────────────────────────────────────────────────────
  const loadAvg  = os.loadavg()
  const cpuCores = os.cpus().length
  const loadPct  = (loadAvg[0] / cpuCores) * 100

  if (loadPct > CPU_THRESHOLD_PCT && !(await isOnCooldown('alert_cpu'))) {
    await sendAdminAlert(
      'High CPU Load',
      '🔥',
      `<p style="font-size:15px;color:#92400e;">CPU load is at <strong>${loadPct.toFixed(0)}%</strong> of capacity.</p>
       ${table(
         row('1-min load avg', loadAvg[0].toFixed(2)) +
         row('5-min load avg', loadAvg[1].toFixed(2)) +
         row('15-min load avg', loadAvg[2].toFixed(2)) +
         row('CPU cores', String(cpuCores)) +
         row('Threshold', `${CPU_THRESHOLD_PCT}%`)
       )}`
    )
    await setCooldown('alert_cpu')
    alerts.push('high_cpu')
  }

  // ── 3. Memory ─────────────────────────────────────────────────────────────
  const totalMem = os.totalmem()
  const usedMem  = totalMem - os.freemem()
  const memPct   = (usedMem / totalMem) * 100

  if (memPct > MEMORY_THRESHOLD_PCT && !(await isOnCooldown('alert_memory'))) {
    await sendAdminAlert(
      'High Memory Usage',
      '⚠️',
      `<p style="font-size:15px;color:#92400e;">Memory usage is at <strong>${memPct.toFixed(0)}%</strong>.</p>
       ${table(
         row('Used',      fmt(usedMem)) +
         row('Total',     fmt(totalMem)) +
         row('Free',      fmt(totalMem - usedMem)) +
         row('Threshold', `${MEMORY_THRESHOLD_PCT}%`)
       )}`
    )
    await setCooldown('alert_memory')
    alerts.push('high_memory')
  }

  // ── 4. Disk ───────────────────────────────────────────────────────────────
  const disk = getDiskUsage()
  if (disk && disk.pct > DISK_THRESHOLD_PCT && !(await isOnCooldown('alert_disk'))) {
    await sendAdminAlert(
      'High Disk Usage',
      '💾',
      `<p style="font-size:15px;color:#92400e;">Disk usage is at <strong>${disk.pct.toFixed(0)}%</strong>.</p>
       ${table(
         row('Used',      fmt(disk.used)) +
         row('Total',     fmt(disk.total)) +
         row('Free',      fmt(disk.free)) +
         row('Threshold', `${DISK_THRESHOLD_PCT}%`)
       )}`
    )
    await setCooldown('alert_disk')
    alerts.push('high_disk')
  }

  // ── 5. Photo storage ──────────────────────────────────────────────────────
  const photoBytes = getPhotoBytes()
  const photoGB    = photoBytes / 1e9

  if (photoGB > PHOTO_THRESHOLD_GB && !(await isOnCooldown('alert_photos'))) {
    await sendAdminAlert(
      'Photo Storage Getting Full',
      '📸',
      `<p style="font-size:15px;color:#92400e;">Photo storage has reached <strong>${photoGB.toFixed(1)} GB</strong>.</p>
       ${table(
         row('Current size', fmt(photoBytes)) +
         row('Threshold',    `${PHOTO_THRESHOLD_GB} GB`) +
         row('Location',     'public/uploads/')
       )}
       <p style="font-size:13px;color:#6b7280;">Consider moving photo storage off-server to S3 or Cloudflare R2.</p>`
    )
    await setCooldown('alert_photos')
    alerts.push('high_photo_storage')
  }

  // ── 6. Database backups ───────────────────────────────────────────────────
  const latestBackup = getLatestBackup()
  if (!latestBackup && !(await isOnCooldown('alert_backup_missing'))) {
    await sendAdminAlert(
      'Database Backup Missing',
      '🛟',
      `<p style="font-size:15px;color:#991b1b;">No database backup metadata was found.</p>
       ${table(
         row('Expected file', 'backups/db/latest-backup.json') +
         row('Expected cadence', `less than ${BACKUP_MAX_AGE_HOURS} hours old`)
       )}
       <p style="font-size:13px;color:#6b7280;">Run <code>npm run db:backup</code> on the server and add it to cron.</p>`
    )
    await setCooldown('alert_backup_missing')
    alerts.push('backup_missing')
  } else if (latestBackup) {
    const backupAgeHours = (Date.now() - new Date(latestBackup.createdAt).getTime()) / (60 * 60 * 1000)
    if (backupAgeHours > BACKUP_MAX_AGE_HOURS && !(await isOnCooldown('alert_backup_stale'))) {
      await sendAdminAlert(
        'Database Backup Is Stale',
        '🧯',
        `<p style="font-size:15px;color:#92400e;">The latest database backup is too old.</p>
         ${table(
           row('Backup file', latestBackup.backupFile) +
           row('Created at', latestBackup.createdAt) +
           row('Age', `${backupAgeHours.toFixed(1)} hours`) +
           row('Size', latestBackup.sizeBytes ? fmt(latestBackup.sizeBytes) : 'Unknown') +
           row('Max allowed age', `${BACKUP_MAX_AGE_HOURS} hours`)
         )}
         <p style="font-size:13px;color:#6b7280;">Check that the backup cron is still running and that pg_dump is available on the server.</p>`
      )
      await setCooldown('alert_backup_stale')
      alerts.push('backup_stale')
    }
  }

  // ── 7. Expired trials ─────────────────────────────────────────────────────
  try {
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`
    const expired = await sql<ExpiredTrialRow[]>`
      SELECT name, trial_ends_at
      FROM organizations
      WHERE status = 'trial'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at < NOW()
    `
    if (expired.length > 0 && !(await isOnCooldown('alert_trials'))) {
      const orgList = expired.map((o) =>
        row(o.name, `Expired ${new Date(o.trial_ends_at).toLocaleDateString()}`)
      ).join('')
      await sendAdminAlert(
        `${expired.length} Trial${expired.length > 1 ? 's' : ''} Expired`,
        '⏰',
        `<p style="font-size:15px;color:#92400e;"><strong>${expired.length}</strong> organization${expired.length > 1 ? 's have' : ' has'} an expired trial and ${expired.length > 1 ? 'are' : 'is'} still marked as "trial" status.</p>
         ${table(orgList)}
         <p style="font-size:13px;color:#6b7280;">Update their status in the admin panel to Active or Suspended.</p>`
      )
      await setCooldown('alert_trials')
      alerts.push('expired_trials')
    }
  } catch {}

  console.log(`[cron/health-check] checked — alerts: ${alerts.length > 0 ? alerts.join(', ') : 'none'}`)

  return NextResponse.json({
    ok: true,
    checked: ['db', 'cpu', 'memory', 'disk', 'photos', 'backups', 'trials'],
    alerts,
    metrics: {
      dbMs,
      loadPct:   parseFloat(loadPct.toFixed(1)),
      memPct:    parseFloat(memPct.toFixed(1)),
      diskPct:   disk ? parseFloat(disk.pct.toFixed(1)) : null,
      photoGB:   parseFloat(photoGB.toFixed(2)),
      latestBackupAt: latestBackup?.createdAt ?? null,
    },
  })
}
