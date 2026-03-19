-- Create storage bucket for proof-of-payment uploads.
-- Required for student proof uploads to work (was missing, causing 500 errors).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload proof of payment.
CREATE POLICY "payments_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payments');

-- Allow public read so proof URLs returned to admin work.
CREATE POLICY "payments_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payments');
