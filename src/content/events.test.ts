import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('moves graduation to 3 April 2027 and launches chaplaincy the next day', () => {
  const events = readFileSync(join(root, 'src/content/events.ts'), 'utf8')
  const chaplaincy = readFileSync(join(root, 'src/app/(marketing)/chaplaincy/page.tsx'), 'utf8')
  const strip = readFileSync(join(root, 'src/components/marketing/UpcomingEventStrip.tsx'), 'utf8')
  const card = readFileSync(join(root, 'src/components/marketing/EventCard.tsx'), 'utf8')

  assert.match(events, /2027-04-03T09:00:00\+02:00/)
  assert.equal(events.includes('2026-12-12'), false)
  assert.match(events, /The Chaplaincy launch is on 4 April 2027, the day after graduation\. Venue to be confirmed\. The time is not confirmed\./)
  assert.match(events, /venue: 'Durbanville Civic Centre'/)
  assert.equal(new Date('2027-04-03T09:00:00+02:00').getUTCDay(), 6)
  assert.equal(new Date(Date.UTC(2027, 3, 4, 12)).getUTCDay(), 0)
  assert.match(chaplaincy, /CHAPLAINCY_LAUNCH_NOTE/)
  assert.match(strip, /event\.notice/)
  assert.match(card, /event\.notice/)
  assert.equal(/Friday/.test(events), false)
})
