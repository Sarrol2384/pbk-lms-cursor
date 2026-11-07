export const UNPUBLISHED_ENROLLMENT_MESSAGE =
  'This programme is not available yet. An administrator needs to publish it before you can open it.'

type CourseEmbed = { title?: string | null } | null | undefined

/** RLS hides unpublished courses from the enrolment embed, so the pointer is null. */
export function enrolledCourseVisible<T extends { title?: string | null }>(
  course: T | null | undefined
): course is T {
  return !!course && typeof course.title === 'string' && course.title.trim().length > 0
}

export function enrolledCourseHidden(course: CourseEmbed): boolean {
  return !enrolledCourseVisible(course)
}
