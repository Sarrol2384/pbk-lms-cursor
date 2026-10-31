/** Official public identity for PBK Memorial Management and Leadership Institute. */

export const INSTITUTE_NAME = 'PBK Memorial Management and Leadership Institute'
export const INSTITUTE_MOTTO = 'Empowering Leaders for Service'
export const INSTITUTE_EMAIL = 'info@pbkleadership.org.za'

/** Inbox for public questions and prospectus applications. Env may override. */
export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || INSTITUTE_EMAIL
}

/**
 * Where staff notifications are sent.
 * ADMIN_NOTIFY_EMAIL may be a comma-separated list. If it is unset, mail goes to the institute inbox.
 */
export function adminNotifyEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFY_EMAIL?.trim() || INSTITUTE_EMAIL
  return Array.from(new Set(raw.split(',').map(part => part.trim()).filter(Boolean)))
}
