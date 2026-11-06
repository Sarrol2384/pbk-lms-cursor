import { formatUsd } from '@/lib/tuition'

type Props = {
  totalDue: number
  paid: number
  balance: number
  firstInstallment: number
  totalInstallments: number
  nextInstallment: number
  remainingInstallments: number
  paymentDeadline?: string
  heading?: string
}

export function TuitionStatusCard({
  totalDue,
  paid,
  balance,
  firstInstallment,
  totalInstallments,
  nextInstallment,
  remainingInstallments,
  paymentDeadline,
  heading = 'Payment',
}: Props) {
  const partial = paid > 0 && firstInstallment > 0 && paid < firstInstallment
  const firstMet = firstInstallment > 0 && paid >= firstInstallment && balance > 0
  return (
    <div className="p-4 bg-white rounded-lg border border-blue-100">
      <p className="font-medium text-gray-900 text-sm mb-2">{heading}</p>
      <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
        <span>Total: <strong>{formatUsd(totalDue)}</strong></span>
        {paid > 0 && <span>Paid: <strong className="text-green-700">{formatUsd(paid)}</strong></span>}
        {balance > 0 && <span>Balance: <strong className="text-amber-700">{formatUsd(balance)}</strong></span>}
      </div>
      {firstInstallment > 0 && balance > 0 && (
        <p className="text-xs text-gray-600 mb-2">
          First instalment: <strong>{formatUsd(firstInstallment)}</strong>
          {paid > 0 && <> • recorded {formatUsd(Math.min(paid, firstInstallment))} of {formatUsd(firstInstallment)}</>}
        </p>
      )}
      {partial && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          Partial payment received. Your enrolment stays payment pending. The course stays closed, and no welcome email is sent, until {formatUsd(firstInstallment)} is recorded.
        </p>
      )}
      {firstMet && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
          First instalment of {formatUsd(firstInstallment)} received. Course access is open. Remaining balance {formatUsd(balance)}.
        </p>
      )}
      {balance > 0 && totalInstallments > 1 && nextInstallment > 0 && (
        <p className="text-xs text-amber-700 font-medium">
          Next instalment: {formatUsd(nextInstallment)}
          {remainingInstallments > 1 ? ` (balance ÷ ${remainingInstallments} months left)` : ''}. Stick to this amount.
        </p>
      )}
      {paymentDeadline && paymentDeadline !== '—' && balance > 0 && (
        <p className="text-xs text-blue-700 font-medium mt-1">Complete all payments by {paymentDeadline}. Course access will be put on hold if the balance is not paid by then.</p>
      )}
    </div>
  )
}
