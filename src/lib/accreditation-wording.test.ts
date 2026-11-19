import assert from 'node:assert/strict'
import test from 'node:test'
import {
  programmeMetaLine,
  publicProgrammeText,
  storesAccreditationClaim,
  withoutSaqaOrNqfClaim,
} from './accreditation-wording.ts'

test('strips a SAQA qualification ID from a programme title', () => {
  assert.equal(
    publicProgrammeText('Bachelor of Business Administration (SAQA 118402)'),
    'Bachelor of Business Administration',
  )
  assert.equal(
    withoutSaqaOrNqfClaim('Business Administration SAQA ID: 118402'),
    'Business Administration',
  )
})

test('replaces SAQA, NQF, and SETA accreditation claims', () => {
  assert.equal(
    withoutSaqaOrNqfClaim('All PBK programmes are aligned with SAQA and the NQF for national and international recognition.'),
    'All PBK programmes are globally accredited.',
  )
  assert.equal(
    withoutSaqaOrNqfClaim('This programme is SAQA accredited and NQF registered.'),
    'This programme is globally accredited.',
  )
  assert.equal(
    withoutSaqaOrNqfClaim(
      'Safety Management is a SETA-aligned programme at NQF Level 5 (120 credits), designed for the South African context.',
    ),
    'Safety Management is a globally accredited programme (120 credits), designed for the South African context.',
  )
})

test('does not print an NQF level next to a programme', () => {
  assert.equal(programmeMetaLine('BBA101', 360), 'BBA101 • 360 credits')
  assert.equal(publicProgrammeText('Offered at NQF 7'), 'Offered at')
})

test('flags stored wording without changing it', () => {
  assert.equal(storesAccreditationClaim({ saqaId: '118402' }), true)
  assert.equal(storesAccreditationClaim({ title: 'Bachelor of Business Administration' }), false)
  assert.equal(
    storesAccreditationClaim({ description: 'Discusses the role of SAQA in occupational policy.' }),
    true,
  )
})
