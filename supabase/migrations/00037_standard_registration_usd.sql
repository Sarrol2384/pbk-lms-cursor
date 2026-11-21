-- NOT APPLIED. Do not run this file from the pull request.
-- Do not run it on staging, production (ownoxqbsdmhacalegsmr), or any other Supabase project.
-- Number 00037. It follows 00036_tighten_content_grants.sql.
--
-- 00034 created public.programme_fee_schedule and public.registration_fee_config
-- with standard registration NULL. That amount is now 25 whole US dollars for
-- academic and theology programmes that are not Master's or PhD (RPL).
-- RPL registration stays 100. public.courses.fee is left unchanged.
-- Chaplaincy certification fees are not stored here. They live in
-- src/content/programme-fees.ts (registration 50, ACBC membership 50 per year).
-- No tax is added.

UPDATE public.registration_fee_config
SET
  amount_usd = 25,
  note = 'Standard registration for academic and theology programmes that are not Master''s or PhD (RPL). Whole US dollars. RPL registration stays 100 on programme_fee_schedule.'
WHERE id = 'standard'
  AND (amount_usd IS NULL OR amount_usd = 25);

UPDATE public.programme_fee_schedule
SET registration_usd = 25
WHERE level NOT IN ('masters_rpl', 'phd_rpl')
  AND (registration_usd IS NULL OR registration_usd = 25);

DO $$
DECLARE
  standard_amount integer;
  non_rpl_mismatch integer;
  rpl_mismatch integer;
BEGIN
  SELECT amount_usd INTO standard_amount
  FROM public.registration_fee_config
  WHERE id = 'standard';

  IF standard_amount IS DISTINCT FROM 25 THEN
    RAISE EXCEPTION 'standard registration is %, expected 25', standard_amount;
  END IF;

  SELECT count(*) INTO non_rpl_mismatch
  FROM public.programme_fee_schedule
  WHERE level NOT IN ('masters_rpl', 'phd_rpl')
    AND registration_usd IS DISTINCT FROM 25;

  IF non_rpl_mismatch <> 0 THEN
    RAISE EXCEPTION 'non-RPL registration rows not set to 25: %', non_rpl_mismatch;
  END IF;

  SELECT count(*) INTO rpl_mismatch
  FROM public.programme_fee_schedule
  WHERE level IN ('masters_rpl', 'phd_rpl')
    AND registration_usd IS DISTINCT FROM 100;

  IF rpl_mismatch <> 0 THEN
    RAISE EXCEPTION 'RPL registration rows not left at 100: %', rpl_mismatch;
  END IF;
END
$$;
