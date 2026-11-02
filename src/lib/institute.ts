/** Official public identity for PBK Memorial Management and Leadership Institute. */

export const INSTITUTE_NAME = 'PBK Memorial Management and Leadership Institute'
export const INSTITUTE_MOTTO = 'Empowering Leaders for Service'
export const INSTITUTE_EMAIL = 'info@pbkleadership.org.za'

/** Direct-call sharecall hotline. Display keeps the spaces; the tel link does not. */
export const INSTITUTE_HOTLINE_DISPLAY = '0861 911 911'
export const INSTITUTE_HOTLINE_TEL = '0861911911'
/** E.164 form of 0861 911 911 for Organization JSON-LD. */
export const INSTITUTE_HOTLINE_SCHEMA = '+27861911911'

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
