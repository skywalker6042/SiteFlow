/**
 * Creates the first owner user for SiteFlow.
 * Run with: npx tsx scripts/seed-owner.ts
 *
 * Set EMAIL and PASSWORD via env or edit the defaults below.
 */
import postgres from 'postgres'
import { hashSync } from 'bcryptjs'

const EMAIL    = process.env.OWNER_EMAIL    ?? 'owner@siteflow.com'
const PASSWORD = process.env.OWNER_PASSWORD ?? 'changeme123'
const ORG_ID   = '00000000-0000-0000-0000-000000000001'

const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://gymuser:Br3anna!@localhost:5433/gymdb')

async function run() {
  const hash = hashSync(PASSWORD, 12)

  // Upsert user
  const [user] = await sql`
    INSERT INTO users (email, password_hash, platform_role)
    VALUES (${EMAIL}, ${hash}, 'admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id, email
  `
  console.log(`✓ User: ${user.email} (${user.id})`)

  // Upsert org_member as owner
  await sql`
    INSERT INTO org_members (org_id, user_id, role, permissions)
    VALUES (
      ${ORG_ID},
      ${user.id},
      'owner',
      '{"can_view_financials":true,"can_edit_jobs":true,"can_manage_schedule":true,"can_upload_photos":true,"can_view_all_jobs":true}'
    )
    ON CONFLICT (org_id, user_id) DO UPDATE
      SET role = 'owner',
          permissions = EXCLUDED.permissions
  `
  console.log(`✓ Org member: owner of org ${ORG_ID}`)
  console.log(`\nLogin: ${EMAIL} / ${PASSWORD}`)

  await sql.end()
}

run().catch((err) => { console.error(err); process.exit(1) })
