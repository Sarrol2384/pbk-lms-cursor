/**
 * Tuition rules for PBK LMS. Amounts are US dollars stored as the existing
 * integers. Nothing here converts a historical fee.
 */

export const USD_BANKING_NOTE = 'Contact PBK Admin for USD banking details before payment'

export type PaymentSlice = {
  amount?: number | null
  amount_paid?: number | null
  total_installments?: number | null
  installment_amount?: number | null
}

export type TuitionPosition = {
  totalDue: number
  totalPaid: number
  balance: number
  totalInstallments: number
  firstInstallment: number
  meetsFirstInstallment: boolean
  fullyPaid: boolean
  belowFirstInstallment: boolean
}

export type RecordOutcome = {
  openCourse: boolean
  sendWelcome: boolean
  keepPaymentPending: boolean
  markPaymentsApproved: boolean
  partialNotice: boolean
}

export function formatUsd(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0
  const negative = n < 0
  const rounded = Math.abs(Math.round(n))
  const body = rounded.toLocaleString('en-US')
  return `${negative ? '-' : ''}$${body}`
}

export function parseAmountReceived(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  return Math.round(value)
}

/** First instalment the student must reach before the course opens. Pay-in-full uses the whole fee. */
export function firstInstallmentDue(
  totalDue: number,
  totalInstallments: number,
  installmentAmount?: number | null
): number {
  const due = Math.max(0, Math.round(Number.isFinite(totalDue) ? totalDue : 0))
  const count = Math.max(1, Math.round(Number.isFinite(totalInstallments) ? totalInstallments : 1) || 1)
  if (due === 0) return 0
  if (count === 1) return due
  if (installmentAmount != null && Number.isFinite(installmentAmount) && installmentAmount > 0) {
    return Math.round(installmentAmount)
  }
  return Math.ceil(due / count)
}

export function assessTuition(payments: PaymentSlice[] | null | undefined): TuitionPosition {
  const rows = payments ?? []
  const totalDue = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const totalPaid = rows.reduce((sum, row) => sum + (row.amount_paid ?? 0), 0)
  const totalInstallments = Math.max(1, rows[0]?.total_installments ?? 1)
  const firstInstallment = firstInstallmentDue(totalDue, totalInstallments, rows[0]?.installment_amount)
  const meetsFirstInstallment = totalDue > 0 && totalPaid >= firstInstallment
  const fullyPaid = totalDue > 0 && totalPaid >= totalDue
  return {
    totalDue,
    totalPaid,
    balance: totalDue - totalPaid,
    totalInstallments,
    firstInstallment,
    meetsFirstInstallment,
    fullyPaid,
    belowFirstInstallment: !meetsFirstInstallment,
  }
}

/**
 * Ledger total after inserting `amountReceived`.
 * Transaction rows are the accumulation. A higher historical amount_paid that
 * was stored without a matching transaction is kept and the new receipt is added.
 */
export function accumulatedAmountPaid(
  previousAmountPaid: number,
  transactionSumAfterInsert: number,
  amountReceived: number
): number {
  const previous = Math.max(0, Math.round(previousAmountPaid || 0))
  const txSum = Math.max(0, Math.round(transactionSumAfterInsert || 0))
  const received = Math.max(0, Math.round(amountReceived || 0))
  const priorTransactions = Math.max(0, txSum - received)
  const legacyNotInLedger = Math.max(0, previous - priorTransactions)
  return txSum + legacyNotInLedger
}

export function outcomeAfterRecording(
  position: TuitionPosition,
  options: { welcomeAlreadySent: boolean }
): RecordOutcome {
  if (!position.meetsFirstInstallment) {
    return {
      openCourse: false,
      sendWelcome: false,
      keepPaymentPending: true,
      markPaymentsApproved: false,
      partialNotice: position.totalPaid > 0,
    }
  }
  return {
    openCourse: true,
    sendWelcome: !options.welcomeAlreadySent,
    keepPaymentPending: false,
    markPaymentsApproved: position.fullyPaid,
    partialNotice: false,
  }
}

/** Course content requires an approved enrolment and either the first instalment or an explicit override. */
export function courseAccessAllowed(
  status: string | null | undefined,
  position: TuitionPosition,
  accessOverride: boolean
): boolean {
  if (status !== 'approved') return false
  return position.meetsFirstInstallment || accessOverride === true
}

export function canIssueCompletionDocument(
  position: TuitionPosition,
  enrollmentStatus: string | null | undefined
): boolean {
  return enrollmentStatus === 'approved' && position.fullyPaid
}

export function manualGrantAllowed(input: {
  enrollmentStatus: string
  position: TuitionPosition
  override: boolean
  liftingHold: boolean
  hadLegitimateAccess: boolean
}): { ok: true; recordOverride: boolean } | { ok: false; error: string } {
  const status = (input.enrollmentStatus || '').toLowerCase()
  if (status === 'pending_approval' || status === 'pending' || status === 'rejected') {
    return { ok: false, error: 'Approve the application before granting course access.' }
  }
  if (input.liftingHold && input.hadLegitimateAccess) {
    return { ok: true, recordOverride: false }
  }
  if (input.position.meetsFirstInstallment) {
    return { ok: true, recordOverride: false }
  }
  if (input.override) {
    return { ok: true, recordOverride: true }
  }
  return {
    ok: false,
    error: 'The amount recorded is below the first instalment. Course access stays closed. Record the first instalment, or grant access with an explicit admin override.',
  }
}
