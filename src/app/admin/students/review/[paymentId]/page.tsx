import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PaymentReviewCard from '@/components/admin/PaymentReviewCard'

function formatAmount(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default async function PaymentReviewPage({
  params,
}: {
  params: { paymentId: string }
}) {
  const { paymentId } = params
  const supabase = createServiceClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      id, amount, amount_paid, status, proof_url, created_at,
      total_installments, installment_number,
      profiles:user_id (id, first_name, last_name, email, phone, id_number),
      courses:course_id (id, title, code)
    `)
    .eq('id', paymentId)
    .single()

  if (error || !payment) notFound()
  if ((payment as any).status !== 'pending') {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">← Back to Students</Link>
          <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-medium text-amber-900">This payment has already been processed.</p>
          <p className="text-sm text-amber-700 mt-1">Status: {(payment as any).status}</p>
        </div>
      </div>
    )
  }

  const p = payment as any
  const total = p.amount ?? 0
  const paid = p.amount_paid ?? 0
  const balance = total - paid
  const totalInstallments = p.total_installments ?? 1

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
          ← Back to Students
        </Link>
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review payment</h1>
      <p className="text-gray-500 text-sm mb-6">
        Record amount received, approve full payment, or reject.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                {[p.profiles?.first_name?.charAt(0), p.profiles?.last_name?.charAt(0)].filter(Boolean).join('') || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {[p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(' ') || p.profiles?.email || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">{p.profiles?.email}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {p.courses?.title} • {p.courses?.code}
                  {totalInstallments > 1 && <span> • {totalInstallments} installments</span>}
                  {' • '}Total R{formatAmount(total)}
                  {paid > 0 && <span> • Paid R{formatAmount(paid)}</span>}
                  {balance > 0 && <span> • Balance R{formatAmount(balance)}</span>}
                </p>
              </div>
            </div>
          </div>

          <PaymentReviewCard
            paymentId={paymentId}
            proofUrl={p.proof_url}
            balance={balance}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}
