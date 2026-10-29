-- Students were granted SELECT on quiz_questions, which includes correct_answer.
-- Drop that policy. The student quiz page loads questions with the service role
-- and asks only for id, question, options, and marks (never correct_answer).
-- Admins and lecturers keep the existing quiz_questions_admin policy.

DROP POLICY IF EXISTS "quiz_questions_student_read" ON public.quiz_questions;
