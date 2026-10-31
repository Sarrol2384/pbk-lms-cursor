-- Public 2027 prospectus applications (no student account required).
-- Apply after 00023. If 00024–00026 from the student-journey pull request are present, apply those first.
-- This file does not depend on 00024–00026. Do not apply it to the live database from the pull request.

CREATE TABLE IF NOT EXISTS public.prospectus_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,
  city TEXT,
  programme_id TEXT NOT NULL,
  programme_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  level TEXT NOT NULL,
  study_mode TEXT NOT NULL,
  highest_qualification TEXT NOT NULL,
  document_path TEXT,
  popia_consent BOOLEAN NOT NULL DEFAULT FALSE,
  popia_consent_at TIMESTAMPTZ,
  CONSTRAINT prospectus_applications_status CHECK (status IN ('new', 'contacted', 'accepted', 'declined')),
  CONSTRAINT prospectus_applications_level CHECK (level IN ('certificate', 'diploma', 'advanced_diploma')),
  CONSTRAINT prospectus_applications_mode CHECK (study_mode IN ('full_time', 'part_time', 'evening', 'online')),
  CONSTRAINT prospectus_applications_popia CHECK (popia_consent = TRUE AND popia_consent_at IS NOT NULL),
  CONSTRAINT prospectus_applications_email CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT prospectus_applications_lengths CHECK (
    char_length(first_name) BETWEEN 2 AND 80
    AND char_length(last_name) BETWEEN 2 AND 80
    AND char_length(email) BETWEEN 3 AND 200
    AND char_length(phone) BETWEEN 7 AND 30
    AND char_length(programme_id) BETWEEN 2 AND 80
    AND char_length(programme_name) BETWEEN 2 AND 160
    AND char_length(school_name) BETWEEN 2 AND 160
    AND char_length(highest_qualification) BETWEEN 2 AND 160
    AND (id_number IS NULL OR char_length(id_number) BETWEEN 1 AND 32)
    AND (city IS NULL OR char_length(city) BETWEEN 1 AND 80)
    AND (document_path IS NULL OR char_length(document_path) BETWEEN 1 AND 300)
  )
);

CREATE INDEX IF NOT EXISTS prospectus_applications_created_at_idx
  ON public.prospectus_applications (created_at DESC);

CREATE INDEX IF NOT EXISTS prospectus_applications_status_idx
  ON public.prospectus_applications (status);

COMMENT ON TABLE public.prospectus_applications IS
  'Prospectus applications submitted on /apply without an account. Admins reply from their own email.';

ALTER TABLE public.prospectus_applications ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors may insert a new, consented application only.
-- They cannot set a document path or a status other than new. The app uploads documents with the service role.
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
  );

DROP POLICY IF EXISTS "prospectus_applications_admin_select" ON public.prospectus_applications;
CREATE POLICY "prospectus_applications_admin_select"
  ON public.prospectus_applications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS "prospectus_applications_admin_update" ON public.prospectus_applications;
CREATE POLICY "prospectus_applications_admin_update"
  ON public.prospectus_applications
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('super_admin', 'admin'))
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('super_admin', 'admin'))
  );

REVOKE ALL ON TABLE public.prospectus_applications FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.prospectus_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.prospectus_applications TO authenticated;
GRANT ALL ON TABLE public.prospectus_applications TO service_role;

-- Private bucket for optional supporting documents. No anon storage policy; the server uploads with the service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospectus-applications', 'prospectus-applications', false)
ON CONFLICT (id) DO NOTHING;
