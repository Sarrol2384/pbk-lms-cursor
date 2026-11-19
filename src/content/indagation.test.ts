import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INDAGATION_FEES,
  INDAGATION_META_DESCRIPTION,
  INDAGATION_PARTNERSHIP,
  INDAGATION_PATH,
  INDAGATION_WHATSAPP_LINK,
  formatUsd,
} from './indagation.ts'
import { isPublicPath, PUBLIC_PATH_PREFIXES } from '../lib/public-paths.ts'

const flyerFees = {
  bachelors: [159.57, 132.98, 159.57, 132.98],
  masters: [265.96, 159.57, 265.96, 132.98],
  'phd-social': [425.53, 265.96, 425.53, 132.98],
} as const

test('keeps Indagation fees in one constant, in flyer order', () => {
  assert.deepEqual(
    INDAGATION_FEES.services.map(service => service.id),
    ['proposal', 'analysis', 'report', 'consultancy'],
  )
  assert.deepEqual(
    INDAGATION_FEES.services.map(service => service.label),
    [...INDAGATION_PARTNERSHIP.services],
  )

  for (const level of INDAGATION_FEES.levels) {
    const expected = flyerFees[level.id as keyof typeof flyerFees]
    if (expected) {
      assert.ok(level.amounts)
      assert.deepEqual(
        INDAGATION_FEES.services.map(service => level.amounts?.[service.id]),
        expected,
      )
      assert.equal(level.note, null)
    }
  }

  const scientific = INDAGATION_FEES.levels.find(level => level.id === 'phd-scientific')
  assert.equal(scientific?.label, 'PhD scientific research')
  assert.equal(scientific?.amounts, null)
  assert.equal(scientific?.note, 'Prices depend on the kind of research.')
})

test('formats full US dollar amounts without tax wording', () => {
  assert.equal(formatUsd(159.57), 'USD 159.57')
  assert.equal(formatUsd(132.98), 'USD 132.98')
  assert.equal(formatUsd(265.96), 'USD 265.96')
  assert.equal(formatUsd(425.53), 'USD 425.53')
  assert.equal(formatUsd(1000), 'USD 1\u00a0000.00')
  assert.equal(formatUsd(159.57).includes('VAT'), false)
})

test('uses the flyer partnership wording for PBK students', () => {
  assert.equal(
    INDAGATION_PARTNERSHIP.heading,
    'The Indagation Institute (TII) and PBK Memorial Leadership Institute',
  )
  assert.equal(
    INDAGATION_PARTNERSHIP.tagline,
    'Strategic partners for quality research and academic excellence',
  )
  assert.match(INDAGATION_PARTNERSHIP.about, /legitimate and reputable research organisation/)
  assert.match(INDAGATION_PARTNERSHIP.benefitsTitle, /PBK student/)
  assert.equal(INDAGATION_PARTNERSHIP.benefits.includes('Access to TII services for research support, training and consultancy'), true)
  assert.equal(INDAGATION_PARTNERSHIP.email, 'indagationinstitute@gmail.com')
  assert.equal(INDAGATION_PARTNERSHIP.whatsAppDisplay, '+260 766 100 934')
  assert.equal(INDAGATION_WHATSAPP_LINK.href, 'https://wa.me/260766100934')
  assert.equal(INDAGATION_WHATSAPP_LINK.target, '_blank')
  assert.equal(INDAGATION_WHATSAPP_LINK.rel, 'noopener noreferrer')
  assert.equal(INDAGATION_PARTNERSHIP.slogan, 'Augmenting critical thinking and problem solving.')
  assert.equal(INDAGATION_PARTNERSHIP.about.includes('LCBMU'), false)
})

test('does not claim SAQA, NQF, SETA, or VAT on the partnership page', () => {
  const text = JSON.stringify({
    INDAGATION_PARTNERSHIP,
    INDAGATION_FEES,
    INDAGATION_META_DESCRIPTION,
  })
  assert.equal(/\b(SAQA|NQF|SETA|VAT)\b/i.test(text), false)
})

test('publishes the research support page to signed-out visitors', () => {
  assert.equal(INDAGATION_PATH, '/research-support')
  assert.equal(PUBLIC_PATH_PREFIXES.includes(INDAGATION_PATH), true)
  assert.equal(isPublicPath(INDAGATION_PATH), true)
  assert.equal(isPublicPath('/student/dashboard'), false)
})
