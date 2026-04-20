import sql from '@/lib/db'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/ui/PrintButton'
import { InvoiceSignatureSection } from '@/components/ui/InvoiceSignatureSection'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ token: string }> }

function InvoiceHeader({ orgLogo, orgName, orgPhone, title, date }: {
  orgLogo: string | null; orgName: string; orgPhone: string | null; title: string; date: string
}) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-gray-100 flex items-start justify-between gap-4">
      <div>
        {orgLogo ? (
          <img src={orgLogo} alt={orgName} className="h-12 w-12 object-contain rounded-lg mb-3" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-teal-500 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">{orgName.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <p className="text-base font-bold text-gray-900">{orgName}</p>
        {orgPhone && <p className="text-sm text-gray-500 mt-0.5">{orgPhone}</p>}
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-400 mt-1">{date}</p>
      </div>
    </div>
  )
}

function BillTo({ clientName, address, clientPhone, jobName, plannedStart, plannedEnd }: {
  clientName: string | null; address: string | null; clientPhone: string | null
  jobName: string; plannedStart: string | null; plannedEnd: string | null
}) {
  return (
    <div className="px-8 py-6 border-b border-gray-100 grid grid-cols-2 gap-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Bill To</p>
        {clientName && <p className="text-sm font-semibold text-gray-900">{clientName}</p>}
        {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}
        {clientPhone && <p className="text-sm text-gray-500 mt-0.5">{clientPhone}</p>}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Project</p>
        <p className="text-sm font-semibold text-gray-900">{jobName}</p>
        {plannedStart && (
          <p className="text-sm text-gray-500 mt-0.5">
            {plannedStart}{plannedEnd ? ` – ${plannedEnd}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default async function InvoicePage({ params }: PageProps) {
  const { token } = await params

  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`
  await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT`
  await sql`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS co_separate_invoice BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS require_signature   BOOLEAN NOT NULL DEFAULT false
  `
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_signatures (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id         UUID NOT NULL,
      invoice_type   TEXT NOT NULL DEFAULT 'contract',
      company_id     UUID NOT NULL,
      signature_data TEXT NOT NULL,
      signer_name    TEXT,
      signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, invoice_type)
    )
  `
  await sql`ALTER TABLE invoice_signatures ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'contract'`
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_signatures_job_id_key') THEN
        ALTER TABLE invoice_signatures DROP CONSTRAINT invoice_signatures_job_id_key;
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_signatures_job_id_invoice_type_key') THEN
        ALTER TABLE invoice_signatures ADD CONSTRAINT invoice_signatures_job_id_invoice_type_key UNIQUE (job_id, invoice_type);
      END IF;
    END $$
  `

  const [job] = await sql`
    SELECT
      j.id, j.name, j.address, j.client_name, j.client_phone,
      j.total_value, j.amount_billed, j.amount_paid,
      j.planned_start, j.planned_end, j.scope, j.share_token,
      o.name AS org_name, o.logo_url AS org_logo, o.phone AS org_phone,
      o.co_separate_invoice, o.require_signature
    FROM jobs j
    JOIN organizations o ON o.id = j.company_id
    WHERE j.share_token = ${token}
  `
  if (!job) notFound()

  const [changeOrders, existingSignature, existingCoSignature] = await Promise.all([
    sql`SELECT description, amount FROM change_orders WHERE job_id = ${job.id} AND approved = true ORDER BY created_at ASC`,
    sql`SELECT * FROM invoice_signatures WHERE job_id = ${job.id} AND invoice_type = 'contract'`,
    sql`SELECT * FROM invoice_signatures WHERE job_id = ${job.id} AND invoice_type = 'change_orders'`,
  ])

  const contractValue = Number(job.total_value)
  const coTotal       = changeOrders.reduce((s: number, co: any) => s + Number(co.amount), 0)
  const grandTotal    = contractValue + coTotal
  const amountBilled  = Number(job.amount_billed)
  const amountPaid    = Number(job.amount_paid)
  const balanceDue    = grandTotal - amountPaid
  const invoiceDate   = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const isSigned      = !!existingSignature[0]
  const signature     = existingSignature[0] as any
  const isCoSigned    = !!existingCoSignature[0]
  const coSignature   = existingCoSignature[0] as any
  const separateCOs   = !!job.co_separate_invoice && changeOrders.length > 0

  const headerProps = {
    orgLogo: job.org_logo, orgName: job.org_name, orgPhone: job.org_phone, date: invoiceDate,
  }
  const billProps = {
    clientName: job.client_name, address: job.address, clientPhone: job.client_phone,
    jobName: job.name, plannedStart: job.planned_start, plannedEnd: job.planned_end,
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4 gap-8 print:bg-white print:p-0 print:gap-0">

      {/* ── Invoice 1: Contract ── */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl print:shadow-none print:rounded-none print:break-after-page">
        <InvoiceHeader {...headerProps} title="Invoice" />
        <BillTo {...billProps} />

        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Description</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-3 text-gray-900">Contract value</td>
                <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(contractValue)}</td>
              </tr>
              {!separateCOs && (changeOrders as any[]).map((co, i) => (
                <tr key={i}>
                  <td className="py-3 text-gray-600">Change order — {co.description}</td>
                  <td className="py-3 text-right font-medium text-gray-700">+{formatCurrency(Number(co.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-2">
            {!separateCOs && coTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(grandTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Billed to date</span>
              <span className="font-medium text-gray-900">{formatCurrency(amountBilled)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payments received</span>
              <span className="font-medium text-green-600">− {formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2 pt-3 border-t border-gray-200">
              <span className="text-gray-900">Balance Due</span>
              <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(Math.max(balanceDue, 0))}
              </span>
            </div>
          </div>
        </div>

        {job.scope && (
          <div className="px-8 pb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scope of Work</p>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{job.scope}</p>
          </div>
        )}

        {job.require_signature && (
          <InvoiceSignatureSection
            jobId={job.id} token={token} isSigned={isSigned}
            signerName={signature?.signer_name ?? null}
            signedAt={signature?.signed_at ? new Date(signature.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null}
            signatureData={signature?.signature_data ?? null}
          />
        )}

        <div className="px-8 py-5 bg-gray-50 rounded-b-2xl print:rounded-none border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Thank you for your business.</p>
          <p className="text-xs text-gray-300">Powered by SiteFlo</p>
        </div>
      </div>

      {/* ── Invoice 2: Change Orders (separate document) ── */}
      {separateCOs && (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl print:shadow-none print:rounded-none">
          <InvoiceHeader {...headerProps} title="Change Order Invoice" />
          <BillTo {...billProps} />

          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Description</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(changeOrders as any[]).map((co, i) => (
                  <tr key={i}>
                    <td className="py-3 text-gray-900">{co.description}</td>
                    <td className="py-3 text-right font-medium text-gray-700">{formatCurrency(Number(co.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 border-t border-gray-200 pt-4 flex justify-between text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatCurrency(coTotal)}</span>
            </div>
          </div>

          {job.require_signature && (
            <InvoiceSignatureSection
              jobId={job.id} token={token} invoiceType="change_orders"
              isSigned={isCoSigned}
              signerName={coSignature?.signer_name ?? null}
              signedAt={coSignature?.signed_at ? new Date(coSignature.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null}
              signatureData={coSignature?.signature_data ?? null}
            />
          )}

          <div className="px-8 py-5 bg-gray-50 rounded-b-2xl print:rounded-none border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Thank you for your business.</p>
            <p className="text-xs text-gray-300">Powered by SiteFlo</p>
          </div>
        </div>
      )}

      <PrintButton />
    </div>
  )
}
