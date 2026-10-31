-- Country, and Masters / PhD via Recognition of Prior Learning, on prospectus applications.
-- 00027_prospectus_applications.sql is already applied on the live database.
-- Apply this file by hand after review. Do not apply it from the pull request.

ALTER TABLE public.prospectus_applications
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.prospectus_applications
  ALTER COLUMN country SET DEFAULT 'South Africa';

COMMENT ON COLUMN public.prospectus_applications.country IS
  'Applicant country. Existing rows are set to South Africa. The column stays nullable, and omitted inserts use that default.';

-- Backfill only rows that have no country yet, so existing applications read as South Africa.
UPDATE public.prospectus_applications
SET country = 'South Africa'
WHERE country IS NULL;

ALTER TABLE public.prospectus_applications
  DROP CONSTRAINT IF EXISTS prospectus_applications_level;

ALTER TABLE public.prospectus_applications
  ADD CONSTRAINT prospectus_applications_level
  CHECK (level IN ('certificate', 'diploma', 'advanced_diploma', 'masters_rpl', 'phd_rpl'));

ALTER TABLE public.prospectus_applications
  DROP CONSTRAINT IF EXISTS prospectus_applications_lengths;

ALTER TABLE public.prospectus_applications
  ADD CONSTRAINT prospectus_applications_lengths CHECK (
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
    AND (country IS NULL OR char_length(country) BETWEEN 2 AND 80)
  );

-- prospectus_applications_anon_insert allows an insert when status is new, POPIA consent
-- is recorded, and document_path is null. It does not name level or country, so
-- masters_rpl, phd_rpl, and the country column do not require a policy change.
