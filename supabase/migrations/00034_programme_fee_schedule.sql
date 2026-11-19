-- APPLIED on production (ownoxqbsdmhacalegsmr) on 2026-11-19 with Cyril's approval. Do not re-apply.
-- The 'DO NOT APPLY' notes below are kept for history and no longer apply.
-- APPROVAL AND DEPLOYMENT PREREQUISITE. DO NOT APPLY this file from the pull request.
-- Do not run it on staging, production, or any other database until it has been reviewed and approved.
-- Do not merge it as an applied migration. Do not run a migration push. Paste this file alone, after review.
--
-- Number 00034.
-- Conflict: 00033_prospectus_application_openings.sql already exists on PR #16
-- (branch cursor/application-availability-1403). Do not reuse 00033.
-- PR #16's eligibility list does not include advanced_certificate or bachelors.
-- Widening the prospectus_applications level check does not by itself make those
-- levels openable under 00033. That list has to be reviewed separately.
--
-- This file does not UPDATE public.courses.fee and does not convert stored integers.
-- LMS course rows are not mapped to prospectus levels in this repository.
-- Changing courses.fee would change the first-instalment gate in src/lib/tuition.ts.
-- Until this file is approved, the published amounts are src/content/programme-fees.ts.
--
-- Standard registration stays NULL. Do not invent that amount.
-- RPL registration is 100 whole US dollars on masters_rpl and phd_rpl only.
-- Chaplaincy registration is not configured here.
-- Amounts are full totals. This file does not mention or add a tax.

-- Refuse to continue when either new table already exists. An existing table may
-- have different rows or constraints. This file does not adopt it.
DO $$
BEGIN
  IF to_regclass('public.programme_fee_schedule') IS NOT NULL THEN
    RAISE EXCEPTION 'public.programme_fee_schedule already exists. Refusing to continue.';
  END IF;
  IF to_regclass('public.registration_fee_config') IS NOT NULL THEN
    RAISE EXCEPTION 'public.registration_fee_config already exists. Refusing to continue.';
  END IF;
END
$$;

BEGIN;

COMMENT ON COLUMN public.courses.fee IS
  'Total course fee in whole US dollars. Null means not set. Existing integers are not converted and are not updated by migration 00034.';

CREATE TABLE public.programme_fee_schedule (
  track text NOT NULL,
  level text NOT NULL,
  qualification_name text NOT NULL,
  tuition_usd integer NOT NULL CHECK (tuition_usd > 0),
  duration_label text NOT NULL,
  registration_usd integer CHECK (registration_usd IS NULL OR registration_usd >= 0),
  offered_on_prospectus boolean NOT NULL,
  PRIMARY KEY (track, level),
  CONSTRAINT programme_fee_schedule_track CHECK (track IN ('academic', 'theology')),
  CONSTRAINT programme_fee_schedule_level CHECK (level IN (
    'certificate',
    'advanced_certificate',
    'diploma',
    'advanced_diploma',
    'bachelors',
    'masters_rpl',
    'phd_rpl'
  ))
);

COMMENT ON TABLE public.programme_fee_schedule IS
  'Approved programme tuition in whole US dollars. registration_usd is 100 for RPL levels and NULL for every other level because the standard registration amount is not approved. The Next.js site reads src/content/programme-fees.ts until this table is approved for use.';

COMMENT ON COLUMN public.programme_fee_schedule.registration_usd IS
  'Whole US dollars. 100 on masters_rpl and phd_rpl. NULL on other levels: TODO standard registration amount. Do not invent a number.';

ALTER TABLE public.programme_fee_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.programme_fee_schedule FROM PUBLIC, anon, authenticated;

INSERT INTO public.programme_fee_schedule
  (track, level, qualification_name, tuition_usd, duration_label, registration_usd, offered_on_prospectus)
VALUES
  ('academic', 'certificate', 'Certificate', 500, '6-12 months', NULL, true),
  ('academic', 'advanced_certificate', 'Advanced Certificate', 800, '1 year', NULL, true),
  ('academic', 'diploma', 'Diploma', 1800, '2 years', NULL, true),
  ('academic', 'advanced_diploma', 'Advanced Diploma', 2800, '3 years', NULL, true),
  ('academic', 'bachelors', 'Bachelor''s', 6000, '3-4 years', NULL, true),
  ('academic', 'masters_rpl', 'Master''s (RPL)', 2500, '1-1.5 years', 100, false),
  ('academic', 'phd_rpl', 'PhD (RPL)', 5000, '2-3 years', 100, false),
  ('theology', 'certificate', 'Certificate in Theology/Ministry', 150, '6 months', NULL, true),
  ('theology', 'advanced_certificate', 'Advanced Certificate in Theology', 300, '1 year', NULL, true),
  ('theology', 'diploma', 'Diploma in Theology/Divinity', 600, '2 years', NULL, true),
  ('theology', 'advanced_diploma', 'Advanced Diploma in Theology', 1000, '3 years', NULL, true),
  ('theology', 'bachelors', 'Bachelor''s in Theology/Biblical Studies', 1800, '3-4 years', NULL, true),
  ('theology', 'masters_rpl', 'Master''s in Theology (RPL)', 1200, '1 year', 100, true),
  ('theology', 'phd_rpl', 'PhD in Theology (RPL)', 2500, '2-3 years', 100, true);

-- One configurable value for non-RPL registration. NULL until it is approved.
CREATE TABLE public.registration_fee_config (
  id text PRIMARY KEY,
  amount_usd integer CHECK (amount_usd IS NULL OR amount_usd >= 0),
  note text NOT NULL,
  CONSTRAINT registration_fee_config_id CHECK (id = 'standard')
);

COMMENT ON TABLE public.registration_fee_config IS
  'One row, id standard. amount_usd stays NULL until the non-RPL registration amount is approved. Do not invent a number. RPL registration is 100 and lives on programme_fee_schedule. Chaplaincy is not configured here.';

ALTER TABLE public.registration_fee_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registration_fee_config FROM PUBLIC, anon, authenticated;

INSERT INTO public.registration_fee_config (id, amount_usd, note)
VALUES (
  'standard',
  NULL,
  'TODO: standard registration amount for programmes that are not RPL. Leave NULL. Do not invent a number.'
);

-- New application levels. Existing rows use the previous ids and still pass this check.
-- advanced_certificate and bachelors cannot be stored until this statement is applied.
ALTER TABLE public.prospectus_applications
  DROP CONSTRAINT IF EXISTS prospectus_applications_level;

ALTER TABLE public.prospectus_applications
  ADD CONSTRAINT prospectus_applications_level
  CHECK (level IN (
    'certificate',
    'advanced_certificate',
    'diploma',
    'advanced_diploma',
    'bachelors',
    'masters_rpl',
    'phd_rpl'
  ));

COMMIT;
