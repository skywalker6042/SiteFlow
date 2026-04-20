import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSessionUser, forbidden } from '@/lib/auth-context'
import { createWorker } from 'tesseract.js'

// POST /api/receipts/scan
// Saves the image then uses Tesseract OCR to extract text.
// Pattern matching finds vendor, date, total, tax, subtotal.
// User reviews and fixes anything in the form.

function parseReceiptText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // ── Vendor: first meaningful line (skip very short lines) ─────────────────
  const vendor = lines.find(l => l.length > 2) ?? null

  // ── Date ──────────────────────────────────────────────────────────────────
  let date: string | null = null
  const datePatterns = [
    /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/,           // 04/16/2026, 4-16-26
    /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,              // 2026-04-16
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2},?\s+\d{4})\b/i, // Apr 16, 2026
  ]
  for (const pattern of datePatterns) {
    const m = text.match(pattern)
    if (m) {
      try {
        const d = new Date(m[1])
        if (!isNaN(d.getTime())) { date = d.toISOString().split('T')[0]; break }
      } catch {}
    }
  }

  // ── Dollar amount helper ───────────────────────────────────────────────────
  function findAmount(...labels: string[]): number | null {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`${escaped}[:\\s]*\\$?\\s*([\\d,]+\\.\\d{2})`, 'i')
      const m  = text.match(re)
      if (m) return parseFloat(m[1].replace(/,/g, ''))
    }
    return null
  }

  const total    = findAmount('total', 'amount due', 'balance due', 'grand total', 'amount')
  const tax      = findAmount('tax', 'hst', 'gst', 'vat', 'sales tax')
  const subtotal = findAmount('subtotal', 'sub-total', 'sub total', 'merchandise')

  // ── Category guess from keywords ──────────────────────────────────────────
  const lower = text.toLowerCase()
  let category = 'Other'
  if (/\b(lumber|concrete|steel|pipe|drywall|plywood|hardware|home depot|lowes|menards)\b/.test(lower)) category = 'Materials'
  else if (/\b(fuel|gas|shell|chevron|bp|exxon|mobil|speedway|circle k|pump)\b/.test(lower)) category = 'Gas & Fuel'
  else if (/\b(tool|drill|saw|blade|dewalt|milwaukee|makita|rental)\b/.test(lower)) category = 'Tools & Equipment'
  else if (/\b(permit|fee|license|inspection|city|county|municipality)\b/.test(lower)) category = 'Permits & Fees'
  else if (/\b(restaurant|cafe|mcdonald|subway|pizza|burger|coffee|diner|food|meal|lunch|dinner)\b/.test(lower)) category = 'Meals'
  else if (/\b(office|staples|depot|printer|paper|supply)\b/.test(lower)) category = 'Office & Admin'
  else if (/\b(electric|water|internet|phone|utility|utilities)\b/.test(lower)) category = 'Utilities'
  else if (/\b(insurance|premium|policy|geico|state farm)\b/.test(lower)) category = 'Insurance'

  return { vendor, date, total, tax, subtotal, category }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user.role !== 'owner' && user.platformRole !== 'admin') return forbidden()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Save image
  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename  = `receipt_${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
  await mkdir(uploadDir, { recursive: true })
  const buffer   = Buffer.from(await file.arrayBuffer())
  const filePath = path.join(uploadDir, filename)
  await writeFile(filePath, buffer)
  const imagePath = `/uploads/receipts/${filename}`

  // Run Tesseract OCR with a 20-second timeout
  let extracted = { vendor: null, date: null, total: null, tax: null, subtotal: null, category: 'Other' }
  try {
    console.log('[receipts/scan] starting OCR...')
    const ocrResult = await Promise.race([
      (async () => {
        const worker = await createWorker('eng', 1, {
          cachePath: path.join(process.cwd(), '.tesseract-cache'),
        })
        console.log('[receipts/scan] worker ready, recognizing...')
        const { data: { text } } = await worker.recognize(filePath)
        await worker.terminate()
        console.log('[receipts/scan] OCR done, parsing text...')
        return parseReceiptText(text)
      })(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), 20_000)
      ),
    ])
    if (ocrResult) extracted = ocrResult as typeof extracted
  } catch (err) {
    console.error('[receipts/scan] OCR failed or timed out:', err)
    // Return empty extracted — user fills in manually
  }

  return NextResponse.json({ imagePath, extracted })
}
