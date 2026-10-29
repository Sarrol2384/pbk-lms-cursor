/**
 * How many times a student may submit a given quiz.
 * Change this constant to raise or lower the limit for every quiz.
 */
export const MAX_QUIZ_ATTEMPTS = 3

/**
 * The mark stored on `submissions` and used for module progress is the
 * student's best attempt, not the latest one. Each try is kept on
 * `quiz_attempts`. A later, lower score does not replace a higher one.
 */
export const QUIZ_GRADE_POLICY = 'best' as const
