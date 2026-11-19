import { BANK } from '@/lib/email'
import { USD_BANKING_NOTE } from '@/lib/tuition'

export function BankingDetails() {
  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
      <p className="font-medium text-gray-900 text-sm mb-1">Banking details for payment</p>
      <p className="text-xs text-amber-800 mb-3">{USD_BANKING_NOTE}. Fees are in US dollars. The account below is the institute&apos;s South African account. Use it only after PBK Admin confirms it for your payment, then upload your proof here.</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Bank</dt><dd className="font-medium text-gray-900">{BANK.name}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Account holder</dt><dd className="font-medium text-gray-900">{BANK.accountName}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Account number</dt><dd className="font-medium text-gray-900">{BANK.accountNumber}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Branch code</dt><dd className="font-medium text-gray-900">{BANK.branchCode}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Account type</dt><dd className="font-medium text-gray-900">{BANK.accountType}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-gray-500">Reference</dt><dd className="font-medium text-gray-900">{BANK.reference}</dd></div>
      </dl>
    </div>
  )
}
