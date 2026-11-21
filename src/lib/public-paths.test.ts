import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicPath } from './public-paths.ts'

test('keeps the existing public site open and the portals closed', () => {
  for (const path of [
    '/',
    '',
    '/login',
    '/register',
    '/verify',
    '/forgot-password',
    '/reset-password',
    '/api/auth/callback',
    '/api/auth/signup',
    '/about',
    '/chaplaincy',
    '/education',
    '/team',
    '/apply',
    '/contact',
    '/events',
    '/events/open-day',
    '/api/public/contact',
    '/research-support',
  ]) {
    assert.equal(isPublicPath(path), true, path)
  }

  assert.equal(isPublicPath('/student/dashboard'), false)
  assert.equal(isPublicPath('/admin/courses'), false)
  assert.equal(isPublicPath('/lecturer/dashboard'), false)
})
