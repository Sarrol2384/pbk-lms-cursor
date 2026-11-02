-- App code reads and writes submissions.marks_obtained.
-- Production and staging were created outside these migrations and only have marks.
-- Apply this file by hand after review. Do not apply it from the pull request.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS marks_obtained numeric;

UPDATE public.submissions
SET marks_obtained = marks
WHERE marks_obtained IS NULL
  AND marks IS NOT NULL;

NOTIFY pgrst, 'reload schema';
