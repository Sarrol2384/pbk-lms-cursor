-- Students must not read quiz_questions.correct_answer.
-- Questions are loaded with the service role and the answer column is omitted.
-- Grading stays on the server (service role) in /api/student/quiz-submit.
-- Apply after 00024 (order among 00024–00026 does not matter; keep numeric order).

DROP POLICY IF EXISTS "quiz_questions_student_read" ON quiz_questions;
