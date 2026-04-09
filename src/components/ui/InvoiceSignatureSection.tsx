'use client'

import { useState } from 'react'
import { SignaturePad } from './SignaturePad'
import { CheckCircle } from 'lucide-react'

interface Props {
  jobId: string
  token: string
  invoiceType?: string
  isSigned: boolean
  signerName: string | null
  signedAt: string | null
  signatureData: string | null
}

export function InvoiceSignatureSection({ jobId, token, invoiceType = 'contract', isSigned: initialSigned, signerName: initialName, signedAt, signatureData }: Props) {
  const [signed, setSigned]   = useState(initialSigned)
  const [sigName, setSigName] = useState(initialName)

  if (signed) {
    return (
      <div className="px-8 pb-6 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 pt-6">Signature</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Signed{sigName ? ` by ${sigName}` : ''}</span>
            {signedAt && <span className="text-xs text-gray-400">· {signedAt}</span>}
          </div>
          {signatureData && (
            <img src={signatureData} alt="Signature" className="h-16 object-contain border border-gray-100 rounded-lg bg-gray-50 p-2 max-w-xs" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 pb-6 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 pt-6">Signature Required</p>
      <p className="text-xs text-gray-400 mb-3">Please sign below to accept this invoice.</p>
      <SignaturePad
        jobId={jobId}
        token={token}
        invoiceType={invoiceType}
        onSigned={(name) => { setSigned(true); setSigName(name) }}
      />
    </div>
  )
}
