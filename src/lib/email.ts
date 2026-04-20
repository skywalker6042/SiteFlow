import { Resend } from 'resend'
import sql from '@/lib/db'

const resend  = new Resend(process.env.RESEND_API_KEY)
const FROM    = 'techsupport@siteflo.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://siteflo.app'

// ─── Admin helpers ────────────────────────────────────────────────────────────

async function getAdminEmail(): Promise<string | null> {
  try {
    const [admin] = await sql`SELECT email FROM users WHERE platform_role = 'admin' LIMIT 1`
    return admin?.email ?? null
  } catch {
    return null
  }
}

// ─── Admin alert email ────────────────────────────────────────────────────────

export async function sendAdminAlert(subject: string, emoji: string, bodyHtml: string) {
  try {
    const to = await getAdminEmail()
    if (!to) { console.error('[email] no admin email found for alert'); return }
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `${emoji} SiteFlo Alert: ${subject}`,
      html:    alertHtml(emoji, subject, bodyHtml),
    })
  } catch (err) {
    console.error('[email] sendAdminAlert failed:', err)
  }
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, orgName: string, password: string) {
  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `Welcome to SiteFlo — Your account is ready`,
      html:    welcomeHtml(orgName, to, password),
    })
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err)
  }
}

// ─── Photo deletion warning email ─────────────────────────────────────────────

export async function sendPhotoWarningEmail(
  to:          string,
  jobName:     string,
  downloadUrl: string,
  deleteDate:  string,
) {
  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `Action required: "${jobName}" photos will be deleted on ${deleteDate}`,
      html:    photoWarningHtml(jobName, downloadUrl, deleteDate),
    })
  } catch (err) {
    console.error('[email] sendPhotoWarningEmail failed:', err)
  }
}

// ─── HTML templates ───────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e,#1d4ed8);padding:32px 40px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SiteFlo</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);">Built for the trades</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#0f766e;">siteflo.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function welcomeHtml(orgName: string, email: string, password: string) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">Welcome to SiteFlo!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Your account for <strong style="color:#111827;">${orgName}</strong> is ready. Here are your login details:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Login Email</p>
        <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">${email}</p>
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Temporary Password</p>
        <p style="margin:0;font-size:20px;color:#111827;font-weight:700;letter-spacing:2px;font-family:monospace;">${password}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Please change your password after your first login.</p>

    <a href="${APP_URL}/login"
       style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
      Log In to SiteFlo
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;">
      If you didn't request this account, reply to this email and we'll sort it out immediately.
    </p>
  `)
}

function alertHtml(emoji: string, subject: string, bodyHtml: string) {
  return base(`
    <div style="margin-bottom:24px;">
      <span style="font-size:36px;">${emoji}</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">${subject}</h1>
    <div style="margin-top:16px;">${bodyHtml}</div>
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <a href="${APP_URL}/admin/health"
         style="display:inline-block;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;">
        View Health Dashboard
      </a>
    </div>
  `)
}

function photoWarningHtml(jobName: string, downloadUrl: string, deleteDate: string) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">Download your job photos</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      The job <strong style="color:#111827;">"${jobName}"</strong> has been marked complete.
      Job photos are automatically deleted <strong>30 days after completion</strong> to free up storage.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:28px;">
      <tr><td style="padding:18px 24px;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          <strong>Photos will be permanently deleted on ${deleteDate}.</strong><br>
          Download them before that date to keep a copy.
        </p>
      </td></tr>
    </table>

    <a href="${downloadUrl}"
       style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
      Download All Photos (.zip)
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;">
      This link is unique to your job and does not require you to log in.
      If you have questions, reply to this email.
    </p>
  `)
}
