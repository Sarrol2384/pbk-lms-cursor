-- APPROVAL AND DEPLOYMENT PREREQUISITE. DO NOT APPLY this file from the pull request.
-- Do not run it on staging, production, or any other database until it has been reviewed and approved.
-- This file inserts no rows. After it is applied, every programme stays closed.
-- A later reviewed row in prospectus_application_openings is what opens one distinct qualification.
-- Do not copy published courses into that table. Course status is enrolment content, not application acceptance.
-- Number 00033 avoids 00031 and 00032, which belong to the separate tuition pull request.

-- Pairs the prospectus record already names. This is the ceiling for a future approval,
-- not the list of qualifications that accept applications. The openings table starts empty.
CREATE OR REPLACE FUNCTION public.prospectus_qualification_may_open(p_programme_id text, p_level text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
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

CREATE TABLE IF NOT EXISTS public.prospectus_application_openings (
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
CREATE OR REPLACE FUNCTION public.prospectus_application_is_open(p_programme_id text, p_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
