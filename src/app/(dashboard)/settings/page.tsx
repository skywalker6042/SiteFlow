import sql from '@/lib/db'
import { getOrgId } from '@/lib/auth-context'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SpecialtyManager } from '@/components/settings/SpecialtyManager'
import { RoleManager } from '@/components/settings/RoleManager'
import { LogoUpload } from '@/components/settings/LogoUpload'
import { CompanyProfile } from '@/components/settings/CompanyProfile'
import { OrgSettings, CrewSettings } from '@/components/settings/OrgSettings'
import type { Specialty, OrgRole } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const orgId = await getOrgId()

  await sql`
    CREATE TABLE IF NOT EXISTS org_roles (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#6b7280',
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    ALTER TABLE org_members
    ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES org_roles(id) ON DELETE SET NULL
  `
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT`
  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS co_separate_invoice BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS require_signature   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS track_worker_time   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS track_worker_job    BOOLEAN NOT NULL DEFAULT false
  `

  const [[org], specialties, roles] = await Promise.all([
    sql`SELECT name, logo_url, phone, co_separate_invoice, require_signature, track_worker_time, track_worker_job FROM organizations WHERE id = ${orgId}`,
    sql`SELECT * FROM specialties WHERE company_id = ${orgId} ORDER BY name` as unknown as Promise<Specialty[]>,
    sql`SELECT * FROM org_roles WHERE org_id = ${orgId} ORDER BY name` as unknown as Promise<OrgRole[]>,
  ])

  const orgSettings = {
    co_separate_invoice: org?.co_separate_invoice ?? false,
    require_signature:   org?.require_signature   ?? false,
    track_worker_time:   org?.track_worker_time   ?? false,
    track_worker_job:    org?.track_worker_job     ?? false,
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <span className="text-sm font-semibold text-gray-700">Company Profile</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <CompanyProfile initialName={org?.name ?? ''} initialPhone={org?.phone ?? null} />
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Company Logo</p>
            <LogoUpload initialLogoUrl={org?.logo_url ?? null} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <span className="text-sm font-semibold text-gray-700">Invoice Settings</span>
            <p className="text-xs text-gray-400 mt-0.5">Control how invoices are presented to clients.</p>
          </div>
        </CardHeader>
        <CardBody>
          <OrgSettings initial={orgSettings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <span className="text-sm font-semibold text-gray-700">Crew &amp; Time Tracking</span>
            <p className="text-xs text-gray-400 mt-0.5">Enable clock in/out for crew members.</p>
          </div>
        </CardHeader>
        <CardBody>
          <CrewSettings initial={orgSettings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <span className="text-sm font-semibold text-gray-700">Crew Roles</span>
            <p className="text-xs text-gray-400 mt-0.5">Define roles with specific permission sets, then assign them to crew members.</p>
          </div>
        </CardHeader>
        <CardBody>
          <RoleManager initialRoles={roles} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <span className="text-sm font-semibold text-gray-700">Specialties</span>
            <p className="text-xs text-gray-400 mt-0.5">Create specialties here, then assign them to crew members.</p>
          </div>
        </CardHeader>
        <CardBody>
          <SpecialtyManager initialSpecialties={specialties} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-semibold text-gray-700">About SiteFlow</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 text-sm text-gray-600">
          <p>SiteFlow is a simple job management tool for contractors.</p>
          <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">Version 1.0.0 MVP</div>
        </CardBody>
      </Card>
    </div>
  )
}
