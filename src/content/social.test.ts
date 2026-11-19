import assert from 'node:assert/strict'
import test from 'node:test'
import { FACEBOOK_LINK, FACEBOOK_PAGE_URL } from './social.ts'

test('points at the PBK Facebook page and opens it safely', () => {
  assert.equal(FACEBOOK_PAGE_URL, 'https://www.facebook.com/profile.php?id=61567112200904')
  assert.equal(FACEBOOK_LINK.href, FACEBOOK_PAGE_URL)
  assert.equal(FACEBOOK_LINK.target, '_blank')
  assert.equal(FACEBOOK_LINK.rel, 'noopener noreferrer')
})
