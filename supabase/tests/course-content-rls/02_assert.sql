-- Assertions for the ephemeral RLS fixture. Failures raise and stop the script.
-- Each check sets request.jwt.claim.sub, then SET LOCAL ROLE, so grants are not a bypass.

UPDATE public.enrollments
SET access_override = true
WHERE id = '50000000-0000-4000-8000-000000000007';

DO $$
DECLARE
  amount_sum integer;
  paid_sum integer;
  sentinel_amount integer;
  sentinel_paid integer;
BEGIN
  SELECT COALESCE(SUM(p.amount), 0), COALESCE(SUM(p.amount_paid), 0)
    INTO amount_sum, paid_sum
  FROM public.payments p;
  SELECT s.amount_sum, s.paid_sum INTO sentinel_amount, sentinel_paid FROM public.rls_fixture_sentinel s;
  IF amount_sum IS DISTINCT FROM sentinel_amount OR paid_sum IS DISTINCT FROM sentinel_paid THEN
    RAISE EXCEPTION 'payments changed: amount % -> %, paid % -> %', sentinel_amount, amount_sum, sentinel_paid, paid_sum;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE id <> '50000000-0000-4000-8000-000000000007'
      AND access_override IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'access_override default was not false';
  END IF;
  RAISE NOTICE 'ok preserved payment totals and override default';
END $$;

DO $$
DECLARE
  n integer;
  secrets text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 2 THEN
    RAISE EXCEPTION 'admin without enrolment saw % modules, expected 2', n;
  END IF;
  SELECT count(*) INTO n FROM public.units;
  IF n <> 2 THEN
    RAISE EXCEPTION 'admin saw % units, expected 2', n;
  END IF;
  SELECT count(*) INTO n FROM public.assessments;
  IF n <> 2 THEN
    RAISE EXCEPTION 'admin saw % assessments, expected 2', n;
  END IF;
  SELECT string_agg(content, ',' ORDER BY content) INTO secrets FROM public.units;
  IF secrets IS DISTINCT FROM 'SECRET-A,SECRET-B' THEN
    RAISE EXCEPTION 'admin unit content was %', secrets;
  END IF;
  RAISE NOTICE 'ok admin reads every module, unit, and assessment';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 2 THEN
    RAISE EXCEPTION 'lecturer without enrolment saw % modules, expected 2', n;
  END IF;
  INSERT INTO public.modules (id, course_id, title)
  VALUES ('20000000-0000-4000-8000-0000000000ff', '10000000-0000-4000-8000-00000000000a', 'Staff draft');
  UPDATE public.assessments SET title = 'Staff edit' WHERE id = '40000000-0000-4000-8000-00000000000a';
  DELETE FROM public.modules WHERE id = '20000000-0000-4000-8000-0000000000ff';
  IF EXISTS (SELECT 1 FROM public.modules WHERE id = '20000000-0000-4000-8000-0000000000ff') THEN
    RAISE EXCEPTION 'lecturer delete did not remove the draft module';
  END IF;
  IF (SELECT title FROM public.assessments WHERE id = '40000000-0000-4000-8000-00000000000a') IS DISTINCT FROM 'Staff edit' THEN
    RAISE EXCEPTION 'lecturer assessment update did not apply';
  END IF;
  UPDATE public.assessments SET title = 'Assessment A' WHERE id = '40000000-0000-4000-8000-00000000000a';
  RAISE NOTICE 'ok lecturer reads all courses and can write modules and assessments';
END $$;

DO $$
DECLARE
  n integer;
  secret text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 1 THEN
    RAISE EXCEPTION 'fully paid student saw % modules, expected 1', n;
  END IF;
  SELECT content INTO secret FROM public.units;
  IF secret IS DISTINCT FROM 'SECRET-A' THEN
    RAISE EXCEPTION 'fully paid student read %', secret;
  END IF;
  SELECT count(*) INTO n FROM public.assessments;
  IF n <> 1 THEN
    RAISE EXCEPTION 'fully paid student saw % assessments', n;
  END IF;
  RAISE NOTICE 'ok pay-in-full approved student reads only course A';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 1 THEN
    RAISE EXCEPTION 'exact first instalment saw % modules, expected 1', n;
  END IF;
  IF (SELECT content FROM public.units) IS DISTINCT FROM 'SECRET-A' THEN
    RAISE EXCEPTION 'exact first instalment read the wrong unit';
  END IF;
  RAISE NOTICE 'ok exact first instalment can read course A';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 1 THEN
    RAISE EXCEPTION 'ceil first instalment saw % modules, expected 1', n;
  END IF;
  RAISE NOTICE 'ok ceil(due/count) first instalment can read';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000d', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 1 THEN
    RAISE EXCEPTION 'multi-row first instalment saw % modules, expected 1', n;
  END IF;
  IF (SELECT content FROM public.units) IS DISTINCT FROM 'SECRET-A' THEN
    RAISE EXCEPTION 'multi-row student read the wrong course';
  END IF;
  RAISE NOTICE 'ok first payment row sets the instalment threshold';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'partial payment saw % modules', n;
  END IF;
  SELECT count(*) INTO n FROM public.units;
  IF n <> 0 THEN
    RAISE EXCEPTION 'partial payment saw % units', n;
  END IF;
  SELECT count(*) INTO n FROM public.assessments;
  IF n <> 0 THEN
    RAISE EXCEPTION 'partial payment saw % assessments', n;
  END IF;
  RAISE NOTICE 'ok partial payment below the first instalment is denied';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000c', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'one below ceil saw % modules', n;
  END IF;
  RAISE NOTICE 'ok paid 3333 of ceil 3334 is denied';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'payment_pending saw % modules', n;
  END IF;
  RAISE NOTICE 'ok payment_pending is denied even when the fee is fully recorded';
END $$;

DO $$
DECLARE
  n integer;
  secret text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 1 THEN
    RAISE EXCEPTION 'override saw % modules, expected 1', n;
  END IF;
  SELECT content INTO secret FROM public.units;
  IF secret IS DISTINCT FROM 'SECRET-B' THEN
    RAISE EXCEPTION 'override read %', secret;
  END IF;
  RAISE NOTICE 'ok explicit override reads only the overridden course';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000008', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'on_hold saw % modules', n;
  END IF;
  RAISE NOTICE 'ok on_hold is denied';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000009', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'user with no enrolment saw % modules', n;
  END IF;
  RAISE NOTICE 'ok no enrolment is denied';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'zero due with a positive amount_paid saw % modules', n;
  END IF;
  RAISE NOTICE 'ok a zero fee does not open content';
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 0 THEN
    RAISE EXCEPTION 'authenticated session without a user saw % modules', n;
  END IF;
  RAISE NOTICE 'ok missing auth.uid() sees nothing';
END $$;

-- App service role writes progress, then students are checked again.
SET ROLE service_role;
INSERT INTO public.unit_completions (user_id, unit_id)
VALUES
  ('00000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-00000000000a');
INSERT INTO public.module_progress (user_id, module_id, status)
VALUES ('00000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-00000000000a', 'in_progress');
RESET ROLE;

DO $$
DECLARE
  n integer;
  changed integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.unit_completions;
  IF n <> 1 THEN
    RAISE EXCEPTION 'exact student saw % completion rows, expected own row only', n;
  END IF;
  UPDATE public.module_progress SET status = 'passed' WHERE user_id = auth.uid();
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'student update affected % module_progress rows', changed;
  END IF;
  DELETE FROM public.unit_completions WHERE user_id = auth.uid();
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'student delete affected % completion rows', changed;
  END IF;
  RAISE NOTICE 'ok student update and delete affected no progress rows';
END $$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.unit_completions (user_id, unit_id)
  VALUES ('00000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-00000000000b');
  RAISE EXCEPTION 'student insert unexpectedly succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok student insert denied (% %)', SQLSTATE, SQLERRM;
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%row-level security%' THEN
      RAISE NOTICE 'ok student insert denied (% %)', SQLSTATE, SQLERRM;
    ELSE
      RAISE;
    END IF;
END $$;

DO $$
DECLARE
  n integer;
BEGIN
  IF (SELECT status FROM public.module_progress WHERE user_id = '00000000-0000-4000-8000-000000000004') IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'student update changed module progress';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.unit_completions
    WHERE user_id = '00000000-0000-4000-8000-000000000004'
      AND unit_id = '30000000-0000-4000-8000-00000000000b'
  ) THEN
    RAISE EXCEPTION 'student inserted a completion row';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.unit_completions;
  IF n <> 0 THEN
    RAISE EXCEPTION 'payment_pending read % own completion rows', n;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.unit_completions;
  IF n <> 3 THEN
    RAISE EXCEPTION 'admin saw % completion rows, expected 3', n;
  END IF;
  RAISE NOTICE 'ok payment_pending cannot read progress; staff can read all of it';
END $$;

DO $$
DECLARE
  public_policies integer;
  own_all integer;
BEGIN
  SELECT count(*) INTO public_policies
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('modules', 'units', 'assessments', 'unit_completions', 'module_progress')
    AND cardinality(pol.polroles) = 0;
  IF public_policies <> 0 THEN
    RAISE EXCEPTION '% content policies still apply to PUBLIC', public_policies;
  END IF;

  SELECT count(*) INTO own_all
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  WHERE c.relname IN ('unit_completions', 'module_progress')
    AND pol.polname IN ('unit_completions_own', 'module_progress_own', 'unit_completions_select_own', 'module_progress_select_own');
  IF own_all <> 0 THEN
    RAISE EXCEPTION 'broad own-row policies are still installed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (c.relname, pol.polname) IN (
        ('modules', 'modules_manage_admin'),
        ('modules', 'modules_select'),
        ('units', 'units_manage_admin'),
        ('units', 'units_select'),
        ('assessments', 'assessments_manage'),
        ('assessments', 'assessments_select')
      )
  ) THEN
    RAISE EXCEPTION 'staging policy names were not replaced';
  END IF;

  IF (
    SELECT count(*) FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('modules', 'units', 'assessments')
      AND pol.polname IN ('course_content_staff_all', 'course_content_student_select')
  ) <> 6 THEN
    RAISE EXCEPTION 'expected staff_all and student_select on modules, units, and assessments';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.modules', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated lost SELECT, so the app session cannot read';
  END IF;
  IF has_table_privilege('anon', 'public.modules', 'SELECT')
     OR has_table_privilege('anon', 'public.unit_completions', 'SELECT')
     OR has_table_privilege('anon', 'public.module_progress', 'SELECT') THEN
    RAISE EXCEPTION 'anon still has SELECT on course content or progress';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.unit_completions', 'INSERT') THEN
    RAISE EXCEPTION 'service_role lost INSERT';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'authenticated bypasses RLS';
  END IF;
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'test service_role does not model the API bypass';
  END IF;
  RAISE NOTICE 'ok grants, PUBLIC policies, and bypass flags';
END $$;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM count(*) FROM public.modules;
  RAISE EXCEPTION 'anon select unexpectedly succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok anon select denied (% %)', SQLSTATE, SQLERRM;
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%permission denied%' THEN
      RAISE NOTICE 'ok anon select denied (% %)', SQLSTATE, SQLERRM;
    ELSIF SQLERRM ILIKE '%unexpectedly succeeded%' THEN
      RAISE;
    ELSE
      RAISE;
    END IF;
END $$;
