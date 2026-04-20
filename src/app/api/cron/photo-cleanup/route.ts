import { NextRequest, NextResponse } from 'next/server'
import { readdir, rm, stat } from 'fs/promises'
import path from 'path'
import sql from '@/lib/db'

// GET /api/cron/photo-cleanup
//
// Deletes photos for jobs that were marked complete 30+ days ago.
// Secured with a bearer token — set CRON_SECRET in .env.local.
//
// Run this daily via a server cron job:
//   0 2 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://siteflo.app/api/cron/photo-cleanup
//
// Or on Vercel, add to vercel.json:
//   { "crons": [{ "path": "/api/cron/photo-cleanup", "schedule": "0 2 * * *" }] }
//   (Vercel sends the CRON_SECRET automatically for vercel.json crons)

export async function GET(req: NextRequest) {
  // Verify secret
  const authHeader = req.headers.get('authorization') ?? ''
  const secret     = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`

  // Find all jobs completed 30+ days ago that still have photos
  const jobs = await sql`
    SELECT DISTINCT j.id, j.name, j.company_id
    FROM jobs j
    JOIN job_photos p ON p.job_id = j.id
    WHERE j.status = 'done'
      AND j.completed_at IS NOT NULL
      AND j.completed_at < NOW() - INTERVAL '30 days'
  `

  const results: { jobId: string; filesDeleted: number; error?: string }[] = []

  for (const job of jobs) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', job.id)

    try {
      await stat(uploadDir)
    } catch {
      // Directory doesn't exist — just clean up DB records
      await sql`DELETE FROM job_photos WHERE job_id = ${job.id}`
      results.push({ jobId: job.id, filesDeleted: 0 })
      continue
    }

    try {
      const files = await readdir(uploadDir)

      // Delete each file individually so we can count
      let deleted = 0
      for (const file of files) {
        await rm(path.join(uploadDir, file), { force: true })
        deleted++
      }

      // Remove the now-empty directory
      await rm(uploadDir, { recursive: true, force: true })

      // Delete DB records
      await sql`DELETE FROM job_photos WHERE job_id = ${job.id}`

      results.push({ jobId: job.id, filesDeleted: deleted })
    } catch (err) {
      results.push({ jobId: job.id, filesDeleted: 0, error: String(err) })
    }
  }

  const totalFiles = results.reduce((sum, r) => sum + r.filesDeleted, 0)
  console.log(`[cron/photo-cleanup] Processed ${jobs.length} jobs, deleted ${totalFiles} files`)

  return NextResponse.json({
    processed: jobs.length,
    totalFilesDeleted: totalFiles,
    results,
  })
}
