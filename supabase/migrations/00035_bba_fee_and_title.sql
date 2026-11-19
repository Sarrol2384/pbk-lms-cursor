-- APPROVAL AND DEPLOYMENT PREREQUISITE. DO NOT APPLY this file to production from the pull request.
-- Production project ownoxqbsdmhacalegsmr is not a target of this file until Cyril approves it separately.
-- Staging may receive it only after the pre-check shows exactly one matching course.
--
-- Number 00035. It follows 00034_programme_fee_schedule.sql.
-- 00033 is already used on PR #16. Do not reuse 00033 or 00034.
--
-- PR #17 hides a stored SAQA qualification ID when a title is shown to learners.
-- It does not change the database row. docs/SETA-MODULE-COUNT.md says a reviewed
-- statement is required before the stored title changes. This is that statement
-- for one course only: Bachelor of Business Administration.
--
-- It sets courses.fee to 6000 whole US dollars. It does not convert any other fee.
-- It removes the exact suffix ' (SAQA 118402)' from that one title.
-- It does not change any other course.

-- Pre-check. Read this result before the change. Expect exactly one row.
SELECT id, title, fee
FROM public.courses
WHERE title IN (
  'Bachelor of Business Administration (SAQA 118402)',
  'Bachelor of Business Administration'
)
ORDER BY title;

BEGIN;

DO $$
DECLARE
  match_count integer;
  updated_count integer;
BEGIN
  SELECT count(*) INTO match_count
  FROM public.courses
  WHERE title IN (
    'Bachelor of Business Administration (SAQA 118402)',
    'Bachelor of Business Administration'
  );

  IF match_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 Bachelor of Business Administration course, found %. No fee or title was changed.', match_count;
  END IF;

  UPDATE public.courses
  SET
    title = 'Bachelor of Business Administration',
    fee = 6000
  WHERE title IN (
    'Bachelor of Business Administration (SAQA 118402)',
    'Bachelor of Business Administration'
  );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Expected the Bachelor of Business Administration update to change 1 row, changed %.', updated_count;
  END IF;
END
$$;

COMMIT;

-- Post-check. Expect one row, the title without the SAQA suffix, and fee 6000.
SELECT id, title, fee
FROM public.courses
WHERE title = 'Bachelor of Business Administration';
