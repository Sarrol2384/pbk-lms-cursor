import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { enrolledCourseHidden, enrolledCourseVisible, UNPUBLISHED_ENROLLMENT_MESSAGE } from './enrolled-course.ts'

describe('unpublished enrolment card', () => {
  it('hides a null course embed instead of rendering a blank title and access link', () => {
    assert.equal(enrolledCourseVisible(null), false)
    assert.equal(enrolledCourseHidden(null), true)
    assert.equal(enrolledCourseVisible(undefined), false)
    assert.equal(enrolledCourseVisible({ title: '   ' }), false)
    assert.match(UNPUBLISHED_ENROLLMENT_MESSAGE, /administrator needs to publish/i)
  })

  it('leaves a published programme visible', () => {
    const course = { title: 'National Diploma', code: 'ND-01', nqf_level: 6, credits: 240 }
    assert.equal(enrolledCourseVisible(course), true)
    assert.equal(course.title, 'National Diploma')
  })
})
