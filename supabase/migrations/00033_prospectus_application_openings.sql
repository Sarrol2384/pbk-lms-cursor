-- APPROVAL AND DEPLOYMENT PREREQUISITE. DO NOT APPLY this file from the pull request.
-- Do not run it on staging, production, or any other database until it has been reviewed and approved.
-- Do not run a migration push. Apply this file alone. Do not repair migration history.
-- This file inserts no rows and does not TRUNCATE any table. After it is applied, every
-- programme stays closed until a later reviewed row is added to prospectus_application_openings.
-- Do not copy published courses into that table. Course status is enrolment content, not application acceptance.
--
-- Staging preflight incorporated here, not re-run by this pull request:
-- prospectus_applications columns, checks, and policies match 00027 and 00029.
-- The openings table, these functions, and this trigger are absent. No name collision.
-- anon and authenticated currently hold ALL table privileges, including TRUNCATE and TRIGGER.
-- That is broader than 00027. RLS does not apply to TRUNCATE. This file revokes the extras.
-- schema_migrations on that staging database lists 20261101185715 replicate_prod_schema.
-- 00031 override columns and 00032 policy and private-helper fingerprints are already present
-- in the schema anyway. Do not describe 00031 or 00032 as missing.
-- Production was not inspected and is not a target of this file.
--
-- Post-approval staging checks, read only. Do not TRUNCATE.
-- 1. Before and after, list privileges:
--    SELECT grantee, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name = 'prospectus_applications'
--    ORDER BY grantee, privilege_type;
--    After: anon has INSERT only. authenticated has INSERT, SELECT, and UPDATE.
--    service_role keeps its existing broad grant. PUBLIC has no rows.
-- 2. Column grants, still read only:
--    SELECT grantee, privilege_type, column_name
--    FROM information_schema.column_privileges
--    WHERE table_schema = 'public' AND table_name = 'prospectus_applications'
--      AND grantee IN ('anon', 'authenticated', 'PUBLIC');
--    anon must not gain SELECT, UPDATE, DELETE, or TRUNCATE through a column grant.
-- 3. Privilege probe. This does not remove rows:
--    SELECT has_table_privilege('anon', 'public.prospectus_applications', 'INSERT') AS anon_insert,
--           has_table_privilege('anon', 'public.prospectus_applications', 'SELECT') AS anon_select,
--           has_table_privilege('anon', 'public.prospectus_applications', 'TRUNCATE') AS anon_truncate,
--           has_table_privilege('anon', 'public.prospectus_applications', 'TRIGGER') AS anon_trigger,
--           has_table_privilege('authenticated', 'public.prospectus_applications', 'INSERT') AS authenticated_insert,
--           has_table_privilege('authenticated', 'public.prospectus_applications', 'SELECT') AS authenticated_select,
--           has_table_privilege('authenticated', 'public.prospectus_applications', 'UPDATE') AS authenticated_update,
--           has_table_privilege('authenticated', 'public.prospectus_applications', 'DELETE') AS authenticated_delete,
--           has_table_privilege('authenticated', 'public.prospectus_applications', 'TRUNCATE') AS authenticated_truncate;
--    Expect anon insert true and select, truncate, trigger false.
--    Expect authenticated insert, select, update true and delete, truncate false.
-- 4. Confirm the new function is not a definer:
--    SELECT prosecdef FROM pg_proc
--    WHERE proname = 'prospectus_application_is_open' AND pronamespace = 'public'::regnamespace;
--    prosecdef must be false.
-- 5. Count openings. Expect zero. Do not insert a test row on staging from this pull request.

-- Refuse to continue when the openings table already exists. An existing table may
-- have different constraints, policies, triggers, or rows. This file does not adopt it.
DO $$
BEGIN
  IF to_regclass('public.prospectus_application_openings') IS NOT NULL THEN
    RAISE EXCEPTION 'public.prospectus_application_openings already exists. Refusing to continue. This file does not change that table, its constraints, policies, rows, or triggers.';
  END IF;
END
$$;

-- Pairs the prospectus record already names. This is the ceiling for a future approval,
-- not the list of qualifications that accept applications. The openings table starts empty.
CREATE OR REPLACE FUNCTION public.prospectus_qualification_may_open(p_programme_id text, p_level text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT (p_programme_id, p_level) IN (
    ('business-administration', 'certificate'),
    ('business-administration', 'diploma'),
    ('business-administration', 'advanced_diploma'),
    ('business-management', 'certificate'),
    ('business-management', 'diploma'),
    ('business-management', 'advanced_diploma'),
    ('entrepreneurship', 'certificate'),
    ('entrepreneurship', 'diploma'),
    ('entrepreneurship', 'advanced_diploma'),
    ('organisational-leadership', 'certificate'),
    ('organisational-leadership', 'diploma'),
    ('organisational-leadership', 'advanced_diploma'),
    ('public-administration', 'certificate'),
    ('public-administration', 'diploma'),
    ('public-administration', 'advanced_diploma'),
    ('theology', 'certificate'),
    ('theology', 'diploma'),
    ('theology', 'advanced_diploma'),
    ('theology', 'masters_rpl'),
    ('theology', 'phd_rpl'),
    ('biblical-studies', 'certificate'),
    ('biblical-studies', 'diploma'),
    ('biblical-studies', 'advanced_diploma'),
    ('biblical-studies', 'masters_rpl'),
    ('biblical-studies', 'phd_rpl'),
    ('missiology', 'certificate'),
    ('missiology', 'diploma'),
    ('missiology', 'advanced_diploma'),
    ('missiology', 'masters_rpl'),
    ('missiology', 'phd_rpl'),
    ('chaplaincy', 'certificate'),
    ('chaplaincy', 'diploma'),
    ('chaplaincy', 'advanced_diploma'),
    ('chaplaincy', 'masters_rpl'),
    ('chaplaincy', 'phd_rpl'),
    ('church-administration', 'certificate'),
    ('church-administration', 'diploma'),
    ('church-administration', 'advanced_diploma'),
    ('church-administration', 'masters_rpl'),
    ('church-administration', 'phd_rpl'),
    ('pastoral-care', 'certificate'),
    ('pastoral-care', 'diploma'),
    ('pastoral-care', 'advanced_diploma'),
    ('pastoral-care', 'masters_rpl'),
    ('pastoral-care', 'phd_rpl'),
    ('christian-counselling', 'certificate'),
    ('christian-counselling', 'diploma'),
    ('christian-counselling', 'advanced_diploma'),
    ('christian-psychology', 'certificate'),
    ('christian-psychology', 'diploma'),
    ('christian-psychology', 'advanced_diploma'),
    ('conflict-management', 'certificate'),
    ('conflict-management', 'diploma'),
    ('conflict-management', 'advanced_diploma'),
    ('risk-management', 'certificate'),
    ('risk-management', 'diploma'),
    ('risk-management', 'advanced_diploma'),
    ('safety-and-security-management', 'certificate'),
    ('safety-and-security-management', 'diploma'),
    ('safety-and-security-management', 'advanced_diploma'),
    ('it-cybersecurity', 'certificate'),
    ('it-cybersecurity', 'diploma'),
    ('it-cybersecurity', 'advanced_diploma'),
    ('certificate-in-climate-change', 'certificate')
  );
$$;

CREATE TABLE public.prospectus_application_openings (
  programme_id text NOT NULL,
  level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (programme_id, level),
  CONSTRAINT prospectus_application_openings_eligible
    CHECK (public.prospectus_qualification_may_open(programme_id, level))
);

COMMENT ON TABLE public.prospectus_application_openings IS
  'Qualifications that accept a public application. Empty means none are open. Not the courses table.';

ALTER TABLE public.prospectus_application_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospectus_application_openings_public_read" ON public.prospectus_application_openings;
CREATE POLICY "prospectus_application_openings_public_read"
  ON public.prospectus_application_openings
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.prospectus_application_openings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.prospectus_application_openings TO anon, authenticated;
GRANT ALL ON TABLE public.prospectus_application_openings TO service_role;

-- True only when that exact pair has been inserted. An empty table returns false for every pair.
-- Invoker on purpose. anon and authenticated can already read this table through the
-- public SELECT policy below, and service_role can read it through its table grant.
-- The insert policy and the trigger run as that same role, so a definer is not required.
CREATE OR REPLACE FUNCTION public.prospectus_application_is_open(p_programme_id text, p_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prospectus_application_openings
    WHERE programme_id = p_programme_id
      AND level = p_level
  );
$$;

CREATE OR REPLACE FUNCTION public.prospectus_applications_require_open_pair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.programme_id IS NOT DISTINCT FROM OLD.programme_id
     AND NEW.level IS NOT DISTINCT FROM OLD.level THEN
    RETURN NEW;
  END IF;

  IF NOT public.prospectus_application_is_open(NEW.programme_id, NEW.level) THEN
    RAISE EXCEPTION 'applications are not open for this programme and qualification'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospectus_applications_require_open_pair ON public.prospectus_applications;
CREATE TRIGGER prospectus_applications_require_open_pair
  BEFORE INSERT OR UPDATE ON public.prospectus_applications
  FOR EACH ROW
  EXECUTE PROCEDURE public.prospectus_applications_require_open_pair();

-- Same gate as the trigger, for the anonymous and signed-in insert path that RLS already allows.
DROP POLICY IF EXISTS "prospectus_applications_anon_insert" ON public.prospectus_applications;
CREATE POLICY "prospectus_applications_anon_insert"
  ON public.prospectus_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND popia_consent = TRUE
    AND popia_consent_at IS NOT NULL
    AND document_path IS NULL
    AND public.prospectus_application_is_open(programme_id, level)
  );

REVOKE ALL ON FUNCTION public.prospectus_qualification_may_open(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospectus_application_is_open(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospectus_applications_require_open_pair() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prospectus_qualification_may_open(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prospectus_application_is_open(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prospectus_applications_require_open_pair() TO anon, authenticated, service_role;

-- Least privilege for prospectus_applications, matching the policies in 00027.
-- anon inserts through prospectus_applications_anon_insert and must not read or change rows.
-- authenticated needs INSERT because that same policy includes authenticated,
-- plus SELECT and UPDATE for prospectus_applications_admin_select and prospectus_applications_admin_update.
-- RLS does not apply to TRUNCATE. Staging currently grants ALL, including TRUNCATE and TRIGGER,
-- to anon and authenticated. Revoke those extras. This does not remove any rows.
-- service_role keeps ALL. This does not change privileges on any other table,
-- and it does not change database-wide default privileges.
REVOKE ALL ON TABLE public.prospectus_applications FROM PUBLIC;
REVOKE ALL ON TABLE public.prospectus_applications FROM anon;
REVOKE ALL ON TABLE public.prospectus_applications FROM authenticated;
GRANT INSERT ON TABLE public.prospectus_applications TO anon;
GRANT INSERT, SELECT, UPDATE ON TABLE public.prospectus_applications TO authenticated;
GRANT ALL ON TABLE public.prospectus_applications TO service_role;
