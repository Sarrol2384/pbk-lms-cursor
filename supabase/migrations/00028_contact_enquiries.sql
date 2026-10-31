-- Public contact-form messages.
-- Apply after 00027_prospectus_applications.sql.
-- Do not apply it to the live database from the pull request.

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  popia_consent BOOLEAN NOT NULL DEFAULT FALSE,
  popia_consent_at TIMESTAMPTZ,
  CONSTRAINT contact_enquiries_popia CHECK (popia_consent = TRUE AND popia_consent_at IS NOT NULL),
  CONSTRAINT contact_enquiries_email CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT contact_enquiries_lengths CHECK (
    char_length(name) BETWEEN 2 AND 120
    AND char_length(email) BETWEEN 3 AND 200
    AND char_length(phone) BETWEEN 7 AND 30
    AND char_length(subject) BETWEEN 3 AND 160
    AND char_length(message) BETWEEN 10 AND 5000
  )
);

CREATE INDEX IF NOT EXISTS contact_enquiries_created_at_idx
  ON public.contact_enquiries (created_at DESC);

COMMENT ON TABLE public.contact_enquiries IS
  'Messages from the public contact form. Staff reply from the institute inbox.';

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_enquiries_anon_insert" ON public.contact_enquiries;
CREATE POLICY "contact_enquiries_anon_insert"
  ON public.contact_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    popia_consent = TRUE
    AND popia_consent_at IS NOT NULL
  );

DROP POLICY IF EXISTS "contact_enquiries_admin_select" ON public.contact_enquiries;
CREATE POLICY "contact_enquiries_admin_select"
  ON public.contact_enquiries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('super_admin', 'admin'))
  );

REVOKE ALL ON TABLE public.contact_enquiries FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.contact_enquiries TO anon, authenticated;
GRANT SELECT ON TABLE public.contact_enquiries TO authenticated;
GRANT ALL ON TABLE public.contact_enquiries TO service_role;
