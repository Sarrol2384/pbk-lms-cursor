-- Before 00032, the staging-named select policies let any signed-in user read every course.
DO $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000009', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.modules;
  IF n <> 2 THEN
    RAISE EXCEPTION 'before migration, user with no enrolment saw % modules, expected 2', n;
  END IF;
  SELECT count(*) INTO n FROM public.units;
  IF n <> 2 THEN
    RAISE EXCEPTION 'before migration, user with no enrolment saw % units, expected 2', n;
  END IF;
  SELECT count(*) INTO n FROM public.assessments;
  IF n <> 2 THEN
    RAISE EXCEPTION 'before migration, user with no enrolment saw % assessments, expected 2', n;
  END IF;
  RAISE NOTICE 'ok staging-named select policies are broad before replacement';
END $$;
