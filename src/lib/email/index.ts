const RESEND_API_KEY = process.env.RESEND_API_KEY
const BREVO_API_KEY = process.env.BREVO_API_KEY
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@pbkleadership.org.za'
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'PBK University'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@pbkleadership.org.za'

/** Shared banking details (used in emails and on enroll page). */
export const BANK = {
  name: process.env.BANK_NAME || 'Absa',
  accountName: process.env.BANK_ACCOUNT_NAME || 'PBK Memorial t/a Kriska Solutions',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '4109771651',
  branchCode: process.env.BANK_BRANCH_CODE || '632005',
  accountType: process.env.BANK_ACCOUNT_TYPE || 'Current Account',
  reference: process.env.BANK_REFERENCE || 'Student Name',
}

async function sendViaBrevo(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    let message: string
    try {
      const body = JSON.parse(err) as { message?: string; code?: string }
      message = body.message || `Email failed: ${res.status}`
    } catch {
      message = `Email failed: ${res.status} ${err.slice(0, 200)}`
    }
    throw new Error(message)
  }
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const resendFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const from = `${FROM_NAME} <${resendFrom}>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    let message: string
    try {
      const body = JSON.parse(err) as { message?: string }
      message = body.message || `Email failed: ${res.status}`
    } catch {
      message = `Email failed: ${res.status} ${err.slice(0, 200)}`
    }
    if (/testing emails|your own email|resend\.com\/domains|verify a domain/i.test(message)) {
      throw new Error('We couldn\'t send the email right now. Your application was saved. You will receive banking details once our team processes it, or contact support.')
    }
    throw new Error(message)
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  const providers: { name: string; send: () => Promise<void> }[] = []

  if (BREVO_API_KEY) {
    providers.push({ name: 'Brevo', send: () => sendViaBrevo(to, subject, html) })
  }
  if (RESEND_API_KEY) {
    providers.push({ name: 'Resend', send: () => sendViaResend(to, subject, html) })
  }

  if (providers.length === 0) {
    console.error('Email: No BREVO_API_KEY or RESEND_API_KEY set')
    throw new Error('Email is not configured. Set BREVO_API_KEY and/or RESEND_API_KEY in environment.')
  }

  let lastError: Error | null = null
  for (const p of providers) {
    try {
      await p.send()
      if (providers.indexOf(p) > 0) {
        console.log(`[Email] Fallback: sent via ${p.name} (primary failed)`)
      }
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[Email] ${p.name} failed:`, lastError.message)
    }
  }

  throw lastError ?? new Error('Email send failed')
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0}
  .container{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:#1e3a8a;color:#fff;padding:28px 32px}
  .header h1{margin:0;font-size:20px}
  .header p{margin:4px 0 0;font-size:13px;opacity:.8}
  .body{padding:28px 32px;color:#374151;line-height:1.6}
  .body h2{color:#1e3a8a;font-size:17px;margin-top:0}
  .bank-box{background:#f0f4ff;border:1px solid #c7d7fe;border-radius:6px;padding:16px;margin:16px 0}
  .bank-row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
  .bank-row span:first-child{color:#6b7280}
  .bank-row span:last-child{font-weight:600;color:#111827}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:12px;color:#9ca3af;text-align:center}
  .btn{display:inline-block;background:#1e3a8a;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0}
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>PBK University</h1><p>Learning Management System</p></div>
    <div class="body"><h2>${title}</h2>${body}</div>
    <div class="footer">
      PBK University LMS &nbsp;|&nbsp; <a href="mailto:${SUPPORT_EMAIL}" style="color:#6b7280">${SUPPORT_EMAIL}</a>
    </div>
  </div>
</body></html>`
}

/** Sent when a new user creates an account. */
export async function sendAccountCreatedEmail(to: string, firstName: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
  const body = `
    <p>Dear ${firstName || 'there'},</p>
    <p>Your account has been created successfully.</p>
    <p>You can now sign in with your email and password to browse programmes and apply for courses.</p>
    <p><a href="${loginUrl}" class="btn">Sign in</a></p>
    <p>If you have any questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>${FROM_NAME}</p>`
  await sendEmail(to, `Account created – ${FROM_NAME}`, baseTemplate('Account created', body))
}

export async function sendApplicationReceivedEmail(to: string, firstName: string, courseName: string, applicationOnly?: boolean, courseId?: string) {
  const enrollLink = courseId ? `${appUrl()}/student/enroll/${courseId}` : null
  const body = applicationOnly
    ? `
    <p>Dear ${firstName},</p>
    <p>Thank you for applying to <strong>${courseName}</strong>. We have received your application.</p>
    <p>To complete your registration, choose your payment plan (pay in full, or 3, 6 or 12 months) and upload your proof of payment:</p>
    ${enrollLink ? `<p><a href="${enrollLink}" class="btn">Choose payment plan &amp; upload proof</a></p>` : '<p>Log in to the student portal and go to My Courses to choose your payment plan and upload proof.</p>'}
    <p>You can start the course as soon as your first payment is verified. If you have questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>${FROM_NAME} Admissions</p>`
    : `
    <p>Dear ${firstName},</p>
    <p>Thank you for applying to <strong>${courseName}</strong>. We have received your application and it is currently under review.</p>
    <p>To complete your registration, please submit your proof of payment to the following banking details:</p>
    <div class="bank-box">
      <div class="bank-row"><span>Bank</span><span>${BANK.name}</span></div>
      <div class="bank-row"><span>Account Name</span><span>${BANK.accountName}</span></div>
      <div class="bank-row"><span>Account Number</span><span>${BANK.accountNumber}</span></div>
      <div class="bank-row"><span>Branch Code</span><span>${BANK.branchCode}</span></div>
      <div class="bank-row"><span>Account Type</span><span>${BANK.accountType}</span></div>
      <div class="bank-row"><span>Reference</span><span>${BANK.reference}</span></div>
    </div>
    <p>After you have paid, log in to the student portal and upload your proof of payment on the course application page. Once we verify it, we will activate your account and send you access details.</p>
    <p>If you have any questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>${FROM_NAME} Admissions</p>`
  await sendEmail(to, 'Application Received – ' + FROM_NAME, baseTemplate('Application Received', body))
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Sent when admin approves application: student must choose payment plan and upload proof. */
export async function sendApplicationApprovedEmail(to: string, firstName: string, courseName: string, courseId: string) {
  const link = `${appUrl()}/student/enroll/${courseId}`
  const body = `
    <p>Dear ${firstName},</p>
    <p>Your application for <strong>${courseName}</strong> has been approved.</p>
    <p>Complete your registration by choosing your payment plan (pay in full, or 3, 6 or 12 months) and uploading your proof of payment:</p>
    <p><a href="${link}" class="btn">Choose payment plan &amp; upload proof</a></p>
    <p>You can start the course as soon as your first payment is verified. If you have questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>${FROM_NAME} Admissions</p>`
  await sendEmail(to, `Complete your registration – ${courseName}`, baseTemplate('Application approved', body))
}

/** Sent when admin records a payment: amount received and balance. */
export async function sendPaymentReceivedEmail(to: string, firstName: string, courseName: string, amountReceived: number, balance: number) {
  const body = `
    <p>Dear ${firstName},</p>
    <p>We have received your payment of <strong>R${amountReceived.toLocaleString()}</strong> for <strong>${courseName}</strong>.</p>
    <p>Your remaining balance is <strong>R${balance.toLocaleString()}</strong>.</p>
    <p>You can log in to the student portal to see your payment details and upload proof for any further payments.</p>
    <p>If you have questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>${FROM_NAME}</p>`
  await sendEmail(to, `Payment received – R${amountReceived.toLocaleString()} – ${FROM_NAME}`, baseTemplate('Payment received', body))
}

/**
 * Welcome email when payment is verified and enrollment is approved.
 * Rich template with green banner, login credentials, and "What's Next" steps.
 * If temporaryPassword is provided (e.g. admin-created account), it is shown; otherwise we tell them to use their existing password.
 */
export async function sendWelcomeAccessGrantedEmail(
  to: string,
  firstName: string,
  courseName: string,
  options?: { temporaryPassword?: string }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const loginUrl = `${appUrl}/login`
  const credentialsSection = options?.temporaryPassword
    ? `
      <p><strong>Email:</strong> <a href="mailto:${to}" style="color:#1e3a8a;text-decoration:underline">${to}</a></p>
      <p><strong>Temporary Password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${options.temporaryPassword}</code></p>
      <p style="margin-top:12px;padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:14px">
        <strong>Important:</strong> For security reasons, you will be required to change your password when you first log in.
      </p>`
    : `
      <p><strong>Email:</strong> <a href="mailto:${to}" style="color:#1e3a8a;text-decoration:underline">${to}</a></p>
      <p>Use the password you chose when you registered. If you need to reset it, use &quot;Forgot password?&quot; on the login page.</p>`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0}
  .container{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .banner{background:#15803d;color:#fff;padding:24px 32px;display:flex;align-items:center;gap:12px}
  .banner-icon{font-size:28px}
  .banner-text h1{margin:0;font-size:20px;font-weight:700}
  .banner-text .highlight{background:#eab308;color:#1a1a1a;padding:0 4px}
  .banner-text p{margin:6px 0 0;font-size:13px;opacity:.95}
  .body{padding:28px 32px;color:#374151;line-height:1.6}
  .body h2{color:#1e3a8a;font-size:17px;margin:0 0 12px}
  .body a{color:#1e3a8a;text-decoration:underline}
  .btn{display:inline-block;background:#1e3a8a;color:#fff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:12px 0}
  .important-box{background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:14px}
  .steps{margin:16px 0;padding-left:20px}
  .steps li{margin:8px 0}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:12px;color:#6b7280;text-align:center}
  .footer a{color:#6b7280}
</style></head>
<body>
  <div class="container">
    <div class="banner">
      <span class="banner-icon">🎓</span>
      <div class="banner-text">
        <h1>Welcome to <span class="highlight">${FROM_NAME}</span>!</h1>
        <p>Payment Verified – Access Granted</p>
      </div>
    </div>
    <div class="body">
      <p>Dear ${firstName},</p>
      <p>Congratulations! Your payment has been verified and you are now officially enrolled in the <strong style="color:#1e3a8a;text-decoration:underline">${courseName}</strong> program.</p>
      <h2>Your login credentials</h2>
      ${credentialsSection}
      <p style="margin-top:20px"><a href="${loginUrl}" class="btn">Login to Student Portal</a></p>
      <h2>What&apos;s next?</h2>
      <ol class="steps">
        <li>Click the button above to open the student portal.</li>
        <li>Log in with your email and password.</li>
        ${options?.temporaryPassword ? '<li>Change your password when prompted.</li>' : ''}
        <li>Start your learning journey!</li>
      </ol>
      <p>If you encounter any issues, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    </div>
    <div class="footer">
      ${FROM_NAME} &nbsp;|&nbsp; <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
    </div>
  </div>
</body></html>`
  await sendEmail(to, `Welcome to ${FROM_NAME} – Your Login Credentials`, html)
}

export async function sendRegistrationRejectedEmail(to: string, firstName: string, reason: string) {
  const body = `
    <p>Dear ${firstName},</p>
    <p>Unfortunately, we were unable to approve your application at this time.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>If you believe this is an error or would like to reapply, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <p>Warm regards,<br>PBK University Admissions</p>`
  await sendEmail(to, 'Application Update – PBK University', baseTemplate('Application Update', body))
}

export async function sendAssignmentGradedEmail(to: string, firstName: string, assessmentTitle: string, marks: number, total: number) {
  const body = `
    <p>Dear ${firstName},</p>
    <p>Your submission for <strong>${assessmentTitle}</strong> has been graded.</p>
    <p style="font-size:24px;font-weight:bold;color:#1e3a8a">${marks} / ${total}</p>
    <p>Log in to view your detailed feedback.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/dashboard" class="btn">View Feedback</a></p>`
  await sendEmail(to, `Assignment Graded: ${assessmentTitle}`, baseTemplate('Assignment Graded', body))
}

export async function sendModuleUnlockedEmail(to: string, firstName: string, moduleName: string) {
  const body = `
    <p>Dear ${firstName},</p>
    <p>Well done! You have unlocked <strong>${moduleName}</strong>.</p>
    <p>Log in to start your next module.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/dashboard" class="btn">Continue Learning</a></p>`
  await sendEmail(to, `New Module Unlocked: ${moduleName}`, baseTemplate('New Module Unlocked', body))
}

export async function sendCertificateIssuedEmail(to: string, firstName: string, courseName: string, certNumber: string) {
  const body = `
    <p>Dear ${firstName},</p>
    <p>Congratulations on completing <strong>${courseName}</strong>!</p>
    <p>Your certificate number is: <strong>${certNumber}</strong></p>
    <p>You can download your certificate from the LMS at any time.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/certificates" class="btn">View Certificate</a></p>`
  await sendEmail(to, `Certificate Issued: ${courseName}`, baseTemplate('Certificate Issued', body))
}

/** Admin notification: new application submitted */
export async function sendAdminApplicationSubmittedEmail(
  to: string,
  studentName: string,
  studentEmail: string,
  courseName: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const body = `
    <p>A new application has been submitted.</p>
    <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
    <p><strong>Course:</strong> ${courseName}</p>
    <p><a href="${appUrl}/admin/students" class="btn">Review applications</a></p>`
  await sendEmail(to, `New application: ${studentName} – ${courseName}`, baseTemplate('Admin notification', body))
}

/** Admin notification: student uploaded proof of payment */
export async function sendAdminProofUploadedEmail(
  to: string,
  studentName: string,
  studentEmail: string,
  courseName: string,
  proofUrl: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const body = `
    <p>A student has uploaded proof of payment.</p>
    <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
    <p><strong>Course:</strong> ${courseName}</p>
    <p><a href="${proofUrl}" target="_blank" rel="noopener noreferrer">View proof</a></p>
    <p><a href="${appUrl}/admin/students" class="btn">Review & approve</a></p>`
  await sendEmail(to, `Proof uploaded: ${studentName} – ${courseName}`, baseTemplate('Admin notification', body))
}
