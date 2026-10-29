-- Keep every quiz submission. The app allows MAX_QUIZ_ATTEMPTS (default 3)
-- and stores the official mark on submissions as the student's BEST attempt,
-- not the latest one. See src/lib/quiz.ts.

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments (id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  marks_obtained INTEGER NOT NULL DEFAULT 0,
  total_marks INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, assessment_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_assessment
  ON public.quiz_attempts (user_id, assessment_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_attempts_select_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_select_own
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS quiz_attempts_select_staff ON public.quiz_attempts;
CREATE POLICY quiz_attempts_select_staff
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'lecturer')
    )
  );

-- Students cannot insert or edit attempts. The quiz-submit route uses the service role.
REVOKE ALL ON public.quiz_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

-- One historical row per student/quiz, from the submission that used to be overwritten.
-- Older retakes were not stored, so they cannot be reconstructed.
DO $backfill$
DECLARE
  answers_type text;
BEGIN
  SELECT c.data_type INTO answers_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'submissions'
    AND c.column_name = 'answers';

  IF answers_type IN ('jsonb', 'json') THEN
    INSERT INTO public.quiz_attempts (
      user_id, assessment_id, attempt_number, answers, marks_obtained, total_marks, submitted_at
    )
    SELECT DISTINCT ON (s.user_id, s.assessment_id)
      s.user_id,
      s.assessment_id,
      1,
      COALESCE(s.answers::jsonb, '{}'::jsonb),
      ROUND(COALESCE(s.marks_obtained, 0))::integer,
      COALESCE(a.total_marks, 0),
      COALESCE(s.submitted_at, NOW())
    FROM public.submissions s
    JOIN public.assessments a ON a.id = s.assessment_id
    WHERE a.type IN ('formative_quiz', 'module_test', 'final_exam')
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts q
        WHERE q.user_id = s.user_id AND q.assessment_id = s.assessment_id
      )
    ORDER BY s.user_id, s.assessment_id, s.submitted_at DESC NULLS LAST;
  ELSE
    INSERT INTO public.quiz_attempts (
      user_id, assessment_id, attempt_number, answers, marks_obtained, total_marks, submitted_at
    )
    SELECT DISTINCT ON (s.user_id, s.assessment_id)
      s.user_id,
      s.assessment_id,
      1,
      '{}'::jsonb,
      ROUND(COALESCE(s.marks_obtained, 0))::integer,
      COALESCE(a.total_marks, 0),
      COALESCE(s.submitted_at, NOW())
    FROM public.submissions s
    JOIN public.assessments a ON a.id = s.assessment_id
    WHERE a.type IN ('formative_quiz', 'module_test', 'final_exam')
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts q
        WHERE q.user_id = s.user_id AND q.assessment_id = s.assessment_id
      )
    ORDER BY s.user_id, s.assessment_id, s.submitted_at DESC NULLS LAST;
  END IF;
END
$backfill$;
