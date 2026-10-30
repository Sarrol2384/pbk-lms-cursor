-- Make proof-of-payment and assignment-submission files private.
-- The app serves them with short-lived signed URLs (service role).
-- Apply after 00022.

UPDATE storage.buckets SET public = false WHERE id IN ('payments', 'submissions');

INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "payments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "submissions_public_read" ON storage.objects;
DROP POLICY IF EXISTS "payments_upload" ON storage.objects;
DROP POLICY IF EXISTS "submissions_upload" ON storage.objects;

-- Students may upload and read only their own prefix. Server uploads use the service role.
CREATE POLICY "payments_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payments'
  AND name LIKE 'proof-of-payment/' || auth.uid()::text || '-%'
);

CREATE POLICY "payments_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payments'
  AND name LIKE 'proof-of-payment/' || auth.uid()::text || '-%'
);

CREATE POLICY "payments_staff_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'lecturer')
  )
);

CREATE POLICY "submissions_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND name LIKE 'submissions/' || auth.uid()::text || '/%'
);

CREATE POLICY "submissions_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND name LIKE 'submissions/' || auth.uid()::text || '/%'
);

CREATE POLICY "submissions_staff_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'lecturer')
  )
);
