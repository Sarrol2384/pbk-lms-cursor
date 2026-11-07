const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Path stored on certificates.verification_url and linked from the student page. */
export function certificateVerificationPath(certificateId: string): string {
  return `/verify/${certificateId}`
}

/**
 * /verify alone is email signup confirmation. A certificate check is only
 * /verify/{uuid}, which matches rows already stored before this route existed.
 */
export function parseCertificateVerificationPath(pathname: string): string | null {
  const match = pathname.match(/^\/verify\/([^/]+)$/)
  if (!match || !UUID.test(match[1])) return null
  return match[1].toLowerCase()
}

export function certificatePdfPath(certificateId: string): string {
  return `/api/certificates/${certificateId}/pdf`
}

export type PublicCertificateView = {
  certificateNumber: string
  learnerName: string
  programmeTitle: string
  programmeCode: string | null
  issuedAt: string
}

/** Fields a third party may see. Email, account id, and payment data are omitted. */
export function publicCertificateView(input: {
  certificateNumber: string
  firstName?: string | null
  lastName?: string | null
  programmeTitle?: string | null
  programmeCode?: string | null
  issuedAt: string
}): PublicCertificateView {
  const learnerName = [input.firstName, input.lastName].map((part) => part?.trim() ?? '').filter(Boolean).join(' ')
  const programmeCode = input.programmeCode?.trim() || null
  return {
    certificateNumber: input.certificateNumber,
    learnerName: learnerName || 'Learner',
    programmeTitle: input.programmeTitle?.trim() || 'Programme',
    programmeCode,
    issuedAt: input.issuedAt,
  }
}

export type CertificatePdfAccess = 'unauthorized' | 'forbidden' | 'unavailable' | 'ok'

/** Download stays on the authenticated owner or an admin, and only while full tuition is confirmed. */
export function certificatePdfAccess(input: {
  requesterId: string | null
  ownerId: string
  role: string | null | undefined
  completionAllowed: boolean
}): CertificatePdfAccess {
  if (!input.requesterId) return 'unauthorized'
  const isOwner = input.requesterId === input.ownerId
  const isAdmin = input.role === 'admin' || input.role === 'super_admin'
  if (!isOwner && !isAdmin) return 'forbidden'
  if (!input.completionAllowed) return 'unavailable'
  return 'ok'
}
