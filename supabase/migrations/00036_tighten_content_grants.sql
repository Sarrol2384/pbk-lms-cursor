-- Follow-up to 00032_course_content_access_rls.sql.
-- 00032 grants authenticated SELECT, INSERT, UPDATE, DELETE on the five content tables
-- and revokes ALL from anon and PUBLIC, but it does not remove the extra privileges
-- authenticated already held (TRUNCATE, REFERENCES, TRIGGER, and on Postgres 17 MAINTAIN).
-- TRUNCATE bypasses RLS.
-- This file removes them. service_role is not touched.
-- Applied on production (ownoxqbsdmhacalegsmr) on 2026-11-19 with Cyril's approval,
-- immediately after 00032.

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.modules FROM authenticated, anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.units FROM authenticated, anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.assessments FROM authenticated, anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.unit_completions FROM authenticated, anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.module_progress FROM authenticated, anon, PUBLIC;
