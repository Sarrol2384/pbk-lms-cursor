import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CERTIFICATE_SAVE_ERROR,
  certificateLogEntry,
  completionCertificateRow,
  completionVerificationUrl,
  persistCompletionCertificate,
  type CompletionCertificateInsert,
} from './certificate-issue.ts'

const userId = 'f31d4cb4-0e10-4451-8847-a34cd94de171'
const courseId = '48dcdc66-df95-4d86-a9af-fa4527a15930'

describe('completion certificate row', () => {
  it('always stores a verification URL because the column is NOT NULL and has no default', () => {
    const row = completionCertificateRow({
      userId,
      courseId,
      certificateId: '11111111-1111-4111-8111-111111111111',
      certificateNumber: 'PBK-2026-100001',
      issuedAt: '2026-11-06T00:00:00.000Z',
      appUrl: 'https://staging.example.com',
    })
    assert.equal(row.verification_url, 'https://staging.example.com/verify/11111111-1111-4111-8111-111111111111')
    assert.equal(row.user_id, userId)
    assert.equal(row.course_id, courseId)
    assert.equal('pdf_url' in row, false)
    assert.equal(completionVerificationUrl('abc', null), '/verify/abc')
    assert.equal(completionVerificationUrl('abc', 'not a url'), '/verify/abc')
  })
})

describe('certificate failure log', () => {
  it('keeps the database code and message and drops addresses', () => {
    const entry = certificateLogEntry({
      code: '23502',
      message: 'null value in column "verification_url" of relation "certificates" violates not-null constraint for learner@example.com',
    })
    assert.deepEqual(entry, {
      code: '23502',
      message: 'null value in column "verification_url" of relation "certificates" violates not-null constraint for [redacted]',
    })
    assert.equal('email' in entry, false)
  })
})

describe('persist completion certificate', () => {
  function harness(options?: {
    existing?: string | null
    insertError?: { code?: string; message: string } | null
    insertId?: string | null
    failNotify?: boolean
  }) {
    const emails: string[] = []
    const inserted: CompletionCertificateInsert[] = []
    const logs: { code: string; message: string }[] = []
    let existing = options?.existing ?? null
    const result = persistCompletionCertificate({
      userId,
      courseId,
      appUrl: 'https://staging.example.com',
      now: () => '2026-11-06T00:00:00.000Z',
      newId: () => `id-${inserted.length + 1}`,
      newNumber: () => `PBK-${inserted.length + 1}`,
      find: async () => ({ id: existing, error: null }),
      insert: async (row) => {
        inserted.push(row)
        if (options?.insertError && inserted.length === 1) {
          return { id: null, error: options.insertError }
        }
        existing = options?.insertId === undefined ? row.id : options.insertId
        return { id: existing, error: null }
      },
      notify: async (certificateNumber) => {
        if (options?.failNotify) throw new Error('smtp down learner@example.com')
        emails.push(certificateNumber)
      },
      log: (error) => logs.push(certificateLogEntry(error)),
    })
    return { result, emails, inserted, logs }
  }

  it('emails once when the insert is stored', async () => {
    const run = harness()
    const result = await run.result
    assert.equal(result.ok, true)
    assert.equal(result.created, true)
    assert.equal(result.reason, 'issued')
    assert.equal(result.certificateId, 'id-1')
    assert.deepEqual(run.emails, ['PBK-1'])
    assert.equal(run.inserted[0].verification_url.includes('/verify/id-1'), true)
    assert.equal(run.logs.length, 0)
  })

  it('does not insert or email when a certificate already exists', async () => {
    const run = harness({ existing: 'already' })
    const result = await run.result
    assert.deepEqual(result, { ok: true, created: false, certificateId: 'already', reason: 'already_issued' })
    assert.equal(run.inserted.length, 0)
    assert.equal(run.emails.length, 0)
  })

  it('returns a failure and does not email when the insert is rejected', async () => {
    const run = harness({
      insertError: { code: '23502', message: 'null value in column "verification_url" of relation "certificates" violates not-null constraint' },
    })
    const result = await run.result
    assert.equal(result.ok, false)
    assert.equal(result.created, false)
    assert.equal(result.certificateId, null)
    assert.equal(result.reason, 'insert_failed')
    assert.equal(result.error, CERTIFICATE_SAVE_ERROR)
    assert.match(result.detail ?? '', /verification_url/)
    assert.equal(run.emails.length, 0)
    assert.equal(run.logs.length, 1)
    assert.equal(run.logs[0].code, '23502')
  })

  it('treats a user/course unique collision as the existing document and does not email again', async () => {
    const emails: string[] = []
    let existing: string | null = null
    const result = await persistCompletionCertificate({
      userId,
      courseId,
      appUrl: null,
      now: () => '2026-11-06T00:00:00.000Z',
      newId: () => 'new-id',
      newNumber: () => 'PBK-9',
      find: async () => ({ id: existing, error: null }),
      insert: async () => {
        existing = 'winner'
        return { id: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "certificates_user_id_course_id_key"' } }
      },
      notify: async (certificateNumber) => { emails.push(certificateNumber) },
      log: () => { throw new Error('should not log a resolved duplicate') },
    })
    assert.equal(result.ok, true)
    assert.equal(result.created, false)
    assert.equal(result.certificateId, 'winner')
    assert.equal(emails.length, 0)
  })

  it('retries once when only the certificate number collides, then emails the stored row', async () => {
    const emails: string[] = []
    const numbers: string[] = []
    let attempts = 0
    const result = await persistCompletionCertificate({
      userId,
      courseId,
      appUrl: null,
      now: () => '2026-11-06T00:00:00.000Z',
      newId: () => `id-${attempts + 1}`,
      newNumber: () => `PBK-${attempts + 1}`,
      find: async () => ({ id: null, error: null }),
      insert: async (row) => {
        attempts += 1
        numbers.push(row.certificate_number)
        if (attempts === 1) {
          return { id: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "certificates_certificate_number_key"' } }
        }
        return { id: row.id, error: null }
      },
      notify: async (certificateNumber) => { emails.push(certificateNumber) },
    })
    assert.equal(result.ok, true)
    assert.equal(result.created, true)
    assert.deepEqual(numbers, ['PBK-1', 'PBK-2'])
    assert.deepEqual(emails, ['PBK-2'])
  })

  it('still reports the document when the email send fails', async () => {
    const run = harness({ failNotify: true })
    const result = await run.result
    assert.equal(result.ok, true)
    assert.equal(result.created, true)
    assert.equal(run.emails.length, 0)
  })
})
