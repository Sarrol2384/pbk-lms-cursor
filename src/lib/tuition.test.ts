import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  accumulatedAmountPaid,
  assessTuition,
  canIssueCompletionDocument,
  completionIssueDecision,
  courseAccessAllowed,
  firstInstallmentDue,
  formatUsd,
  manualGrantAllowed,
  outcomeAfterRecording,
  parseAmountReceived,
} from './tuition.ts'

const plan = (paid: number, fee = 12000, installments = 3) =>
  assessTuition([{
    amount: fee,
    amount_paid: paid,
    total_installments: installments,
    installment_amount: installments > 1 ? Math.ceil(fee / installments) : fee,
  }])

describe('first instalment threshold', () => {
  it('uses the stored instalment amount, otherwise ceil(fee / count)', () => {
    assert.equal(firstInstallmentDue(12000, 3, 4000), 4000)
    assert.equal(firstInstallmentDue(10000, 3, null), 3334)
    assert.equal(firstInstallmentDue(12000, 1, 4000), 12000)
    assert.equal(firstInstallmentDue(0, 12, 0), 0)
  })

  it('keeps a payment below the first instalment closed, with no welcome email', () => {
    const position = plan(3999)
    assert.equal(position.firstInstallment, 4000)
    assert.equal(position.meetsFirstInstallment, false)
    assert.equal(position.fullyPaid, false)
    const outcome = outcomeAfterRecording(position, { welcomeAlreadySent: false })
    assert.deepEqual(outcome, {
      openCourse: false,
      sendWelcome: false,
      keepPaymentPending: true,
      markPaymentsApproved: false,
      partialNotice: true,
    })
    assert.equal(courseAccessAllowed('payment_pending', position, false), false)
    assert.equal(courseAccessAllowed('approved', position, false), false)
  })

  it('opens the course at the exact first instalment without treating tuition as complete', () => {
    const position = plan(4000)
    assert.equal(position.meetsFirstInstallment, true)
    assert.equal(position.fullyPaid, false)
    assert.equal(position.balance, 8000)
    const outcome = outcomeAfterRecording(position, { welcomeAlreadySent: false })
    assert.equal(outcome.openCourse, true)
    assert.equal(outcome.sendWelcome, true)
    assert.equal(outcome.keepPaymentPending, false)
    assert.equal(outcome.markPaymentsApproved, false)
    assert.equal(courseAccessAllowed('approved', position, false), true)
    assert.equal(canIssueCompletionDocument(position, 'approved'), false)
    const later = outcomeAfterRecording(position, { welcomeAlreadySent: true })
    assert.equal(later.sendWelcome, false)
  })

  it('marks full payment as complete tuition and allows a completion document', () => {
    const position = plan(12000)
    assert.equal(position.fullyPaid, true)
    assert.equal(position.balance, 0)
    const outcome = outcomeAfterRecording(position, { welcomeAlreadySent: false })
    assert.equal(outcome.openCourse, true)
    assert.equal(outcome.markPaymentsApproved, true)
    assert.equal(canIssueCompletionDocument(position, 'approved'), true)
    assert.equal(canIssueCompletionDocument(position, 'payment_pending'), false)
  })

  it('denies an unpaid enrolment even when the status was set to approved', () => {
    const position = plan(0)
    assert.equal(courseAccessAllowed('approved', position, false), false)
    assert.equal(courseAccessAllowed('payment_pending', position, false), false)
    assert.equal(canIssueCompletionDocument(position, 'approved'), false)
    const outcome = outcomeAfterRecording(position, { welcomeAlreadySent: false })
    assert.equal(outcome.openCourse, false)
    assert.equal(outcome.sendWelcome, false)
    assert.equal(outcome.partialNotice, false)
  })
})

describe('explicit admin override', () => {
  const below = plan(500)

  it('refuses a manual grant below the first instalment unless override is explicit', () => {
    const denied = manualGrantAllowed({
      enrollmentStatus: 'payment_pending',
      position: below,
      override: false,
      liftingHold: false,
      hadLegitimateAccess: false,
    })
    assert.equal(denied.ok, false)

    const granted = manualGrantAllowed({
      enrollmentStatus: 'payment_pending',
      position: below,
      override: true,
      liftingHold: false,
      hadLegitimateAccess: false,
    })
    assert.deepEqual(granted, { ok: true, recordOverride: true })
    assert.equal(courseAccessAllowed('approved', below, true), true)
    assert.equal(canIssueCompletionDocument(below, 'approved'), false)
  })

  it('does not skip application approval, and does not require a new override to lift a legitimate hold', () => {
    const skipped = manualGrantAllowed({
      enrollmentStatus: 'pending_approval',
      position: plan(12000),
      override: true,
      liftingHold: false,
      hadLegitimateAccess: false,
    })
    assert.equal(skipped.ok, false)

    const lifted = manualGrantAllowed({
      enrollmentStatus: 'on_hold',
      position: plan(4000),
      override: false,
      liftingHold: true,
      hadLegitimateAccess: true,
    })
    assert.deepEqual(lifted, { ok: true, recordOverride: false })
  })
})

describe('completion document gate', () => {
  const paidInFull = assessTuition([{
    amount: 300,
    amount_paid: 300,
    total_installments: 3,
    installment_amount: 100,
  }])
  const belowFirst = assessTuition([{
    amount: 300,
    amount_paid: 50,
    total_installments: 3,
    installment_amount: 100,
  }])
  const firstOnly = assessTuition([{
    amount: 300,
    amount_paid: 100,
    total_installments: 3,
    installment_amount: 100,
  }])

  it('issues only when every module passed, the enrolment is approved, and tuition is fully paid', () => {
    assert.equal(paidInFull.fullyPaid, true)
    assert.deepEqual(completionIssueDecision({
      moduleCount: 1,
      allPassed: true,
      position: paidInFull,
      enrollmentStatus: 'approved',
      accessOverride: false,
    }), { action: 'insert' })
  })

  it('keeps a payment below the first instalment from opening the course or issuing a document, even with an override request recorded as false', () => {
    assert.equal(belowFirst.meetsFirstInstallment, false)
    assert.equal(courseAccessAllowed('approved', belowFirst, false), false)
    assert.equal(canIssueCompletionDocument(belowFirst, 'approved'), false)
    assert.deepEqual(completionIssueDecision({
      moduleCount: 1,
      allPassed: true,
      position: belowFirst,
      enrollmentStatus: 'approved',
      accessOverride: false,
    }), { action: 'skip', reason: 'tuition_incomplete' })
  })

  it('does not let an admin access override grant a completion document', () => {
    assert.equal(courseAccessAllowed('approved', belowFirst, true), true)
    assert.deepEqual(completionIssueDecision({
      moduleCount: 1,
      allPassed: true,
      position: belowFirst,
      enrollmentStatus: 'approved',
      accessOverride: true,
    }), { action: 'skip', reason: 'tuition_incomplete' })
    assert.deepEqual(completionIssueDecision({
      moduleCount: 1,
      allPassed: true,
      position: firstOnly,
      enrollmentStatus: 'approved',
      accessOverride: true,
    }), { action: 'skip', reason: 'tuition_incomplete' })
    assert.equal(firstOnly.meetsFirstInstallment, true)
    assert.equal(firstOnly.fullyPaid, false)
  })

  it('does not issue when modules are missing or not all passed', () => {
    assert.deepEqual(completionIssueDecision({
      moduleCount: 0,
      allPassed: false,
      position: paidInFull,
      enrollmentStatus: 'approved',
      accessOverride: false,
    }), { action: 'skip', reason: 'no_modules' })
    assert.deepEqual(completionIssueDecision({
      moduleCount: 2,
      allPassed: false,
      position: paidInFull,
      enrollmentStatus: 'approved',
      accessOverride: false,
    }), { action: 'skip', reason: 'incomplete' })
    assert.deepEqual(completionIssueDecision({
      moduleCount: 1,
      allPassed: true,
      position: paidInFull,
      enrollmentStatus: 'payment_pending',
      accessOverride: false,
    }), { action: 'skip', reason: 'tuition_incomplete' })
  })
})

describe('amount ledger', () => {
  it('adds the receipt to the transaction sum and keeps a higher historical amount_paid', () => {
    assert.equal(accumulatedAmountPaid(1000, 1500, 500), 1500)
    assert.equal(accumulatedAmountPaid(12000, 500, 500), 12500)
    assert.equal(accumulatedAmountPaid(0, 500, 500), 500)
  })

  it('rejects a missing or non-positive amount instead of inventing the full fee', () => {
    assert.equal(parseAmountReceived(undefined), undefined)
    assert.equal(parseAmountReceived(0), undefined)
    assert.equal(parseAmountReceived(-20), undefined)
    assert.equal(parseAmountReceived(Number.NaN), undefined)
    assert.equal(parseAmountReceived(4000.4), 4000)
  })

  it('formats the same integer as USD', () => {
    assert.equal(formatUsd(12000), '$12,000')
    assert.equal(formatUsd(4000), '$4,000')
    assert.equal(formatUsd(0), '$0')
  })
})
