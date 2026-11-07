import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { completionVerificationUrl } from './certificate-issue.ts'
import {
  certificatePdfAccess,
  certificatePdfPath,
  certificateVerificationPath,
  parseCertificateVerificationPath,
  publicCertificateView,
} from './certificate-public.ts'

const STORED_ID = 'e3ce1e8e-30aa-4b3e-9b04-e2f6cd79deee'
const STORED_ORIGIN = 'https://pbk-lms-cursor-git-cursor-fix-cert-6940af-sarrol2384s-projects.vercel.app'
const STORED_URL = `${STORED_ORIGIN}/verify/${STORED_ID}`

describe('certificate verification URL', () => {
  it('resolves the stored /verify/{uuid} link and leaves signup /verify alone', () => {
    assert.equal(parseCertificateVerificationPath(new URL(STORED_URL).pathname), STORED_ID)
    assert.equal(parseCertificateVerificationPath(certificateVerificationPath(STORED_ID)), STORED_ID)
    assert.equal(parseCertificateVerificationPath('/verify'), null)
    assert.equal(parseCertificateVerificationPath('/verify/'), null)
    assert.equal(parseCertificateVerificationPath('/verify/not-a-certificate'), null)
    const generated = completionVerificationUrl(STORED_ID, STORED_ORIGIN)
    assert.equal(generated, STORED_URL)
    assert.equal(parseCertificateVerificationPath(new URL(generated).pathname), STORED_ID)
  })
})

describe('public certificate view', () => {
  it('shows the completion record without email, account id, or payment data', () => {
    const view = publicCertificateView({
      certificateNumber: 'PBK-2026-209963',
      firstName: 'Amahle',
      lastName: 'Dlamini',
      programmeTitle: 'TEST ONLY - PR14 Access Tuition',
      programmeCode: 'TEST-PR14',
      issuedAt: '2026-11-07T00:00:00.000Z',
    })
    assert.equal(view.certificateNumber, 'PBK-2026-209963')
    assert.equal(view.learnerName, 'Amahle Dlamini')
    assert.equal(view.programmeCode, 'TEST-PR14')
    const keys = Object.keys(view).sort()
    assert.deepEqual(keys, ['certificateNumber', 'issuedAt', 'learnerName', 'programmeCode', 'programmeTitle'])
    const packed = JSON.stringify(view)
    assert.equal(packed.includes('@'), false)
    assert.equal(packed.toLowerCase().includes('amount'), false)
    assert.equal(packed.includes('user_id'), false)
  })
})

describe('certificate PDF route', () => {
  const owner = 'f31d4cb4-0e10-4451-8847-a34cd94de171'

  it('points View and Download at /api/certificates/{id}/pdf', () => {
    assert.equal(certificatePdfPath(STORED_ID), `/api/certificates/${STORED_ID}/pdf`)
  })

  it('allows the owner or an admin only after full tuition, and refuses everyone else', () => {
    assert.equal(certificatePdfAccess({
      requesterId: null,
      ownerId: owner,
      role: null,
      completionAllowed: true,
    }), 'unauthorized')
    assert.equal(certificatePdfAccess({
      requesterId: 'someone-else',
      ownerId: owner,
      role: 'student',
      completionAllowed: true,
    }), 'forbidden')
    assert.equal(certificatePdfAccess({
      requesterId: owner,
      ownerId: owner,
      role: 'student',
      completionAllowed: false,
    }), 'unavailable')
    assert.equal(certificatePdfAccess({
      requesterId: owner,
      ownerId: owner,
      role: 'student',
      completionAllowed: true,
    }), 'ok')
    assert.equal(certificatePdfAccess({
      requesterId: 'admin-id',
      ownerId: owner,
      role: 'admin',
      completionAllowed: true,
    }), 'ok')
  })
})
