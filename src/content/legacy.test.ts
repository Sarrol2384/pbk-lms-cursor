import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { LEGACY_HEADING, LEGACY_PARAGRAPHS, LEGACY_QUOTE, LEGACY_TAGLINE } from './legacy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('keeps the full tribute, the founder heading, and South African spelling', () => {
  assert.equal(LEGACY_HEADING, "In Memory of Rev. Percy Betani Kuzang'a (1952-1995)")
  assert.equal(LEGACY_TAGLINE, 'Raising Leaders. Shaping Nations. Preserving a Legacy.')
  assert.equal(
    LEGACY_QUOTE,
    'True leadership is not defined by position, but by character, service, and impact.',
  )
  assert.ok(LEGACY_PARAGRAPHS.length >= 4 && LEGACY_PARAGRAPHS.length <= 6)
  const body = LEGACY_PARAGRAPHS.join('\n')
  for (const phrase of [
    'Luanshya',
    'bookkeeper and mechanic',
    'National Director of Life Ministry Zambia',
    'first Zambian',
    'institutionalise this legacy',
    'centre for leadership formation',
    'cut short in 1995',
    'honouring the past',
    'values he modelled',
  ]) {
    assert.match(body, new RegExp(phrase))
  }
  assert.equal(body.includes('institutionalize'), false)
  assert.equal(/\b(SAQA accredited|VAT)\b/i.test(body), false)

  const about = readFileSync(join(root, 'src/app/(marketing)/about/page.tsx'), 'utf8')
  const tribute = readFileSync(join(root, 'src/components/marketing/LegacyTribute.tsx'), 'utf8')
  assert.match(about, /LegacyTribute/)
  assert.match(tribute, /id="legacy"/)
  assert.match(tribute, /LEGACY_QUOTE/)
})

test('names the memoranda partners and uses the supplied logos', () => {
  const marketing = readFileSync(join(root, 'src/content/marketing.ts'), 'utf8')
  assert.match(marketing, /European Institute of Management & Technology/)
  assert.match(marketing, /EuroAmerican Education/)
  assert.match(marketing, /Birchwood University/)
  assert.equal(marketing.includes('EIMI'), false)
  for (const file of ['eimt.webp', 'euroamerican.webp', 'birchwood.webp']) {
    assert.equal(existsSync(join(root, 'public/logos/partners', file)), true, file)
  }
  const about = readFileSync(join(root, 'src/app/(marketing)/about/page.tsx'), 'utf8')
  const logos = readFileSync(join(root, 'src/components/marketing/MouPartners.tsx'), 'utf8')
  assert.match(about, /MouPartners/)
  assert.match(logos, /alt=\{partner\.alt\}/)
})
