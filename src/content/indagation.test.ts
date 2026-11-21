import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  INDAGATION_FEES,
  INDAGATION_IMAGES,
  INDAGATION_META_DESCRIPTION,
  INDAGATION_PARTNERSHIP,
  INDAGATION_PATH,
  formatUsd,
} from './indagation.ts'
import { isPublicPath, PUBLIC_PATH_PREFIXES } from '../lib/public-paths.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const roundedFees = {
  bachelors: [160, 133, 160, 133],
  masters: [266, 160, 266, 133],
  'phd-social': [426, 266, 426, 133],
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
    const expected = roundedFees[level.id as keyof typeof roundedFees]
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

test('displays whole US dollars and no cents', () => {
  assert.equal(formatUsd(160), 'USD 160')
  assert.equal(formatUsd(133), 'USD 133')
  assert.equal(formatUsd(266), 'USD 266')
  assert.equal(formatUsd(426), 'USD 426')
  assert.equal(formatUsd(159.57), 'USD 160')
  assert.equal(formatUsd(132.98), 'USD 133')
  assert.equal(formatUsd(265.96), 'USD 266')
  assert.equal(formatUsd(425.53), 'USD 426')
  assert.equal(formatUsd(1000), 'USD 1\u00a0000')
  for (const level of INDAGATION_FEES.levels) {
    if (!level.amounts) continue
    for (const service of INDAGATION_FEES.services) {
      const shown = formatUsd(level.amounts[service.id])
      assert.equal(shown.includes('.'), false, shown)
      assert.equal(shown.includes('VAT'), false)
    }
  }
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
  assert.equal('email' in INDAGATION_PARTNERSHIP, false)
  assert.equal('whatsAppDisplay' in INDAGATION_PARTNERSHIP, false)
  assert.equal('whatsAppHref' in INDAGATION_PARTNERSHIP, false)
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

test('sends research enquiries to PBK and keeps the photographs in the repo', () => {
  const page = readFileSync(join(root, 'src/app/(marketing)/research-support/page.tsx'), 'utf8')
  const published = `${page}\n${JSON.stringify(INDAGATION_PARTNERSHIP)}`
  assert.equal(published.includes('indagationinstitute@gmail.com'), false)
  assert.equal(published.includes('766'), false)
  assert.equal(published.includes('wa.me'), false)
  assert.match(page, /supportEmail/)
  assert.match(page, /href="\/contact"/)
  assert.match(page, /from 'next\/image'/)
  assert.match(page, /INDAGATION_IMAGES/)
  assert.equal(INDAGATION_IMAGES.length, 3)
  for (const image of INDAGATION_IMAGES) {
    assert.equal(existsSync(join(root, 'public', image.src.replace(/^\//, ''))), true, image.src)
  }
})

test('publishes the research support page to signed-out visitors', () => {
  assert.equal(INDAGATION_PATH, '/research-support')
  assert.equal(PUBLIC_PATH_PREFIXES.includes(INDAGATION_PATH), true)
  assert.equal(isPublicPath(INDAGATION_PATH), true)
  assert.equal(isPublicPath('/student/dashboard'), false)
})
