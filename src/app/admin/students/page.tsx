import { unstable_noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import StudentsTable from '@/components/admin/StudentsTable'
import SyncPaymentsButton from '@/components/admin/SyncPaymentsButton'

export const dynamic = 'force-dynamic'

export default async function AdminStudentsPage() {
  unstable_noStore()
  const supabase = createServiceClient()

  const paymentsSelect = 'id, user_id, course_id, enrollment_id, amount, status, proof_url, created_at, amount_paid, installment_number, total_installments'
  const [pendingMinimalRes, proofUploadedRes, minimalFallbackRes, allEnrollmentsRes, approvedEnrollmentsRes, onHoldRes, rejectedRes, studentsRes] = await Promise.all([
    supabase.from('payments').select(paymentsSelect).eq('status', 'pending').order('created_at', { ascending: true }),
    supabase.from('payments').select(paymentsSelect).not('proof_url', 'is', null).eq('status', 'pending').order('created_at', { ascending: true }),
    supabase.from('payments').select('id, user_id, course_id, amount, status, proof_url').eq('status', 'pending'),
    supabase.from('enrollments').select('id, user_id, course_id, status, created_at').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('id, user_id, course_id, status, enrolled_at, profiles:user_id(id,first_name,last_name,email,phone,id_number), courses:course_id(id,title,code)').eq('status', 'approved').order('enrolled_at', { ascending: false }),
    supabase.from('enrollments').select('id, user_id, course_id, status, enrolled_at, profiles:user_id(id,first_name,last_name,email,phone,id_number), courses:course_id(id,title,code)').eq('status', 'on_hold').order('enrolled_at', { ascending: false }),
    supabase.from('payments').select('id, amount, status, proof_url, created_at, profiles:user_id(id,first_name,last_name,email,phone,id_number), courses:course_id(title,code)').eq('status', 'rejected').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, first_name, last_name, email, phone, id_number, created_at').eq('role', 'student').order('created_at', { ascending: false }),
  ])

  let rawPending = (pendingMinimalRes.data ?? []) as any[]
  if (rawPending.length === 0 && (proofUploadedRes.data ?? []).length > 0) {
    rawPending = (proofUploadedRes.data ?? []) as any[]
  }
  if (rawPending.length === 0 && (minimalFallbackRes.data ?? []).length > 0) {
    rawPending = (minimalFallbackRes.data ?? []).map((p: any) => ({
      ...p,
      enrollment_id: p.enrollment_id ?? null,
      amount_paid: p.amount_paid ?? 0,
      total_installments: p.total_installments ?? 1,
      created_at: p.created_at ?? new Date().toISOString(),
    })) as any[]
  }
  const byEnrollment = new Map<string, typeof rawPending>()
  const enrollmentIdsWithPayments = new Set<string>()

  const paymentsWithoutEnrollment = rawPending.filter((p: any) => !p.enrollment_id && p.user_id && p.course_id)
  let enrollmentIdByUserCourse: Record<string, string> = {}
  if (paymentsWithoutEnrollment.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id')
      .in('user_id', Array.from(new Set(paymentsWithoutEnrollment.map((p: any) => p.user_id))))
    for (const e of enrollments ?? []) {
      enrollmentIdByUserCourse[`${e.user_id}:${e.course_id}`] = e.id
    }
    for (const p of paymentsWithoutEnrollment) {
      const eid = enrollmentIdByUserCourse[`${p.user_id}:${p.course_id}`]
      if (eid) {
        await supabase.from('payments').update({ enrollment_id: eid }).eq('id', p.id).is('enrollment_id', null)
      }
    }
  }

  for (const p of rawPending) {
    let eid = p.enrollment_id ?? enrollmentIdByUserCourse[`${p.user_id}:${p.course_id}`]
    if (!eid && p.user_id && p.course_id) {
      const { data: enrollMatch } = await supabase.from('enrollments').select('id').eq('user_id', p.user_id).eq('course_id', p.course_id).limit(1).maybeSingle()
      if (enrollMatch?.id) {
        eid = enrollMatch.id
        await supabase.from('payments').update({ enrollment_id: eid }).eq('id', p.id).is('enrollment_id', null)
      }
    }
    if (eid) {
      enrollmentIdsWithPayments.add(eid)
      if (!byEnrollment.has(eid)) byEnrollment.set(eid, [])
      byEnrollment.get(eid)!.push(p)
    } else if (p.proof_url) {
      const fallbackId = `orphan-${p.id}`
      enrollmentIdsWithPayments.add(fallbackId)
      if (!byEnrollment.has(fallbackId)) byEnrollment.set(fallbackId, [])
      byEnrollment.get(fallbackId)!.push(p)
    }
  }

  const paymentUserIds = Array.from(new Set(rawPending.map((p: any) => p.user_id).filter(Boolean)))
  const paymentCourseIds = Array.from(new Set(rawPending.map((p: any) => p.course_id).filter(Boolean)))
  let paymentProfilesMap: Record<string, any> = {}
  let paymentCoursesMap: Record<string, any> = {}
  if (paymentUserIds.length > 0 || paymentCourseIds.length > 0) {
    const [profRes, courseRes] = await Promise.all([
      paymentUserIds.length > 0 ? supabase.from('profiles').select('id, first_name, last_name, email, phone, id_number').in('id', paymentUserIds) : Promise.resolve({ data: [] as any[] }),
      paymentCourseIds.length > 0 ? supabase.from('courses').select('id, title, code').in('id', paymentCourseIds) : Promise.resolve({ data: [] as any[] }),
    ])
    paymentProfilesMap = Object.fromEntries((profRes.data ?? []).map((x: any) => [x.id, x]))
    paymentCoursesMap = Object.fromEntries((courseRes.data ?? []).map((x: any) => [x.id, x]))
  }
  for (const p of rawPending) {
    if (!p.profiles && p.user_id) p.profiles = paymentProfilesMap[p.user_id] ?? null
    if (!p.courses && p.course_id) p.courses = paymentCoursesMap[p.course_id] ?? null
  }

  const allEnrollments = (allEnrollmentsRes.data ?? []) as any[]
  const pendingApplicationRows = allEnrollments.filter((e: any) => {
    if (enrollmentIdsWithPayments.has(e.id)) return false
    const status = (e.status || '').toString().toLowerCase().trim()
    return !status || (status !== 'approved' && status !== 'rejected' && status !== 'on_hold')
  })
  const userIds = Array.from(new Set(pendingApplicationRows.map((e: any) => e.user_id).filter(Boolean)))
  const courseIds = Array.from(new Set(pendingApplicationRows.map((e: any) => e.course_id).filter(Boolean)))
  let profilesMap: Record<string, any> = {}
  let coursesMap: Record<string, any> = {}
  if (userIds.length > 0 || courseIds.length > 0) {
    const [profilesRes, coursesRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('profiles').select('id, first_name, last_name, email, phone, id_number').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
      courseIds.length > 0 ? supabase.from('courses').select('id, title, code').in('id', courseIds) : Promise.resolve({ data: [] as any[] }),
    ])
    profilesMap = Object.fromEntries((profilesRes.data ?? []).map((p: any) => [p.id, p]))
    coursesMap = Object.fromEntries((coursesRes.data ?? []).map((c: any) => [c.id, c]))
  }
  const pendingApplications = pendingApplicationRows.map((e: any) => ({
    ...e,
    profiles: profilesMap[e.user_id] ?? null,
    courses: coursesMap[e.course_id] ?? null,
  }))

  const approvedEnrollmentIds = new Set((approvedEnrollmentsRes.data ?? []).map((e: any) => e.id))

  const pending = Array.from(byEnrollment.entries())
    .filter(([enrollmentId]) => !approvedEnrollmentIds.has(enrollmentId))
    .map(([enrollmentId, payments]) => {
      const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)
      const paid = payments.reduce((s, p) => s + (p.amount_paid ?? 0), 0)
      const primary = payments[0]
      const proofUrl = payments.find((p: any) => p.proof_url)?.proof_url ?? primary?.proof_url ?? null
      return {
        enrollmentId,
        total,
        paid,
        balance: total - paid,
        primaryPayment: primary,
        proofUrl,
        totalInstallments: primary?.total_installments ?? 1,
      }
    })

  const approvedEnrollmentsRaw = (approvedEnrollmentsRes.data ?? []) as any[]
  const approvedIds = approvedEnrollmentsRaw.map((e: any) => e.id)
  let approvedPaymentMap: Record<string, { id: string; total: number; paid: number; balance: number }> = {}
  if (approvedIds.length > 0) {
    const { data: approvedPayments } = await supabase
      .from('payments')
      .select('id, enrollment_id, amount, amount_paid')
      .in('enrollment_id', approvedIds)
    for (const pp of approvedPayments ?? []) {
      const eid = pp.enrollment_id
      if (!eid) continue
      const amt = pp.amount ?? 0
      const paid = pp.amount_paid ?? 0
      const bal = amt - paid
      if (bal > 0 && (!approvedPaymentMap[eid] || approvedPaymentMap[eid].balance < bal)) {
        approvedPaymentMap[eid] = { id: pp.id, total: amt, paid, balance: bal }
      }
    }
  }
  const approvedEnrollments = approvedEnrollmentsRaw.map((e: any) => ({
    ...e,
    paymentForRecord: approvedPaymentMap[e.id] ?? null,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-500 text-sm mt-1">Manage student applications and enrollments. When a student applies, they receive one email with a link to choose a payment plan and upload proof (no further emails until payment is verified). They appear under <strong>Pending</strong> until payment is verified. Approved = current approved enrollments. All Students = users with the student role (remove from Users to clear).</p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="font-medium text-amber-900">Where to approve payments</p>
          <p className="text-amber-800 mt-1">Go to the <strong>Pending</strong> tab → find the student under &quot;Payment pending&quot; → click <strong>Record payment</strong> to enter the amount received, or <strong>Approve full</strong> to approve without recording. Access is granted only after payment is recorded or approved.</p>
          <SyncPaymentsButton />
        </div>
      </div>
      <StudentsTable
        pendingGroups={pending}
        pendingApplications={pendingApplications}
        approvedEnrollments={approvedEnrollments}
        onHoldEnrollments={(onHoldRes.data ?? []) as any[]}
        rejected={(rejectedRes.data ?? []) as any}
        students={(studentsRes.data ?? []) as any}
      />
    </div>
  )
}
