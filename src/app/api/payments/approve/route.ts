import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { recordTuitionReceived } from '@/lib/record-payment'
import { parseAmountReceived } from '@/lib/tuition'

/**
 * Proof approval records the amount actually received.
 * It does not set amount_paid to the full course fee.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const paymentId = body.paymentId as string | undefined
  const amountReceived = parseAmountReceived(body.amountReceived)
  if (!paymentId || amountReceived === undefined) {
    return NextResponse.json({
      error: 'Record the amount actually received. Approving a proof does not set the full fee as paid.',
    }, { status: 400 })
  }

  const result = await recordTuitionReceived(createServiceClient(), {
    paymentId,
    amountReceived,
    recordedBy: user.id,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    success: true,
    fullyPaid: result.fullyPaid,
    openedAccess: result.openedAccess,
    partial: result.partial,
    firstInstallment: result.firstInstallment,
    totalPaid: result.totalPaid,
    balance: result.balance,
    completionDocumentCreated: result.completionDocumentCreated,
    completionDocumentIssued: result.completionDocumentIssued,
    certificateError: result.certificateError ?? null,
  })
}
