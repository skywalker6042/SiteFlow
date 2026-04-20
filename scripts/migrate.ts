/**
 * One-time migration: adds columns and tables that were previously
 * being created inline on every bootstrap request.
 *
 * Safe to run multiple times (all statements use IF NOT EXISTS / IF NOT EXISTS column).
 *
 * Run with: npx tsx scripts/migrate.ts
 */
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? '')

async function run() {
  console.log('Running migrations...')

  // organizations columns
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
  console.log('✓ organizations.logo_url')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT`
  console.log('✓ organizations.phone')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'trial'`
  console.log('✓ organizations.status')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'`
  console.log('✓ organizations.plan')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS track_worker_time BOOLEAN NOT NULL DEFAULT false`
  console.log('✓ organizations.track_worker_time')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS co_separate_invoice BOOLEAN NOT NULL DEFAULT false`
  console.log('✓ organizations.co_separate_invoice')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT false`
  console.log('✓ organizations.require_signature')

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS track_worker_job BOOLEAN NOT NULL DEFAULT false`
  console.log('✓ organizations.track_worker_job')

  // org_roles table
  await sql`
    CREATE TABLE IF NOT EXISTS org_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log('✓ org_roles table')

  // org_members.org_role_id
  await sql`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL`
  console.log('✓ org_members.org_role_id')

  // platform_settings table
  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log('✓ platform_settings table')

  // mobile_sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS mobile_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS mobile_sessions_user_id_idx ON mobile_sessions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS mobile_sessions_expires_at_idx ON mobile_sessions(expires_at)`
  console.log('✓ mobile_sessions table')

  console.log('\nAll migrations complete.')
  await sql.end()
}

run().catch((err) => { console.error(err); process.exit(1) })
