import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** PATCH: admin updates payment amount (e.g. installment amount). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { paymentId } = await params
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const amount = typeof body.amount === 'number' && body.amount >= 0 ? Math.round(body.amount) : undefined
  if (amount === undefined) return NextResponse.json({ error: 'Valid amount (number >= 0) required' }, { status: 400 })

  const service = createServiceClient()
  const { data: payment, error: fetchError } = await service
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status !== 'pending') return NextResponse.json({ error: 'Can only edit amount for pending payments' }, { status: 400 })

  const { error: updateError } = await service
    .from('payments')
    .update({ amount })
    .eq('id', paymentId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
