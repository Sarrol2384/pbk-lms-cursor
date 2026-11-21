import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { LEGACY_HEADING, LEGACY_PARAGRAPHS, LEGACY_TAGLINE } from './legacy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('keeps the tribute to the supplied facts and the founder heading', () => {
  assert.equal(LEGACY_HEADING, "In Memory of Rev. Percy Betani Kuzang'a (1952-1995)")
  assert.equal(LEGACY_TAGLINE, 'Raising Leaders. Shaping Nations. Preserving a Legacy.')
  assert.equal(LEGACY_PARAGRAPHS.length, 3)
  assert.match(LEGACY_PARAGRAPHS[0], /Luanshya|Zambia/)
  assert.match(LEGACY_PARAGRAPHS[1], /Luanshya/)
  assert.match(LEGACY_PARAGRAPHS[1], /students, executives, pastors, and political leaders/)
  assert.match(LEGACY_PARAGRAPHS[2], /bookkeeper and mechanic/)
  assert.match(LEGACY_PARAGRAPHS[2], /character, service, and impact/)
  const body = LEGACY_PARAGRAPHS.join('\n')
  assert.equal(/\b(university|ordained|married|died|wife|children|SAQA|VAT)\b/i.test(body), false)

  const about = readFileSync(join(root, 'src/app/(marketing)/about/page.tsx'), 'utf8')
  assert.match(about, /LegacyTribute/)
})

test('names the memoranda of understanding and leaves a logo TODO', () => {
  const marketing = readFileSync(join(root, 'src/content/marketing.ts'), 'utf8')
  assert.match(marketing, /PBK has Memoranda of Understanding with EIMI, Birchwood and EuroAmerican/)
  assert.match(marketing, /TODO\(logos\)/)
  assert.match(marketing, /Do not hotlink/)
  const about = readFileSync(join(root, 'src/app/(marketing)/about/page.tsx'), 'utf8')
  const home = readFileSync(join(root, 'src/components/marketing/PartnerLogoMarquee.tsx'), 'utf8')
  assert.match(about, /MouPartners/)
  assert.match(home, /mouPartnersStatement/)
})
