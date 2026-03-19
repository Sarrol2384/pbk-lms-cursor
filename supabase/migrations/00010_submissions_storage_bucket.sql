-- Create storage bucket for assignment submission uploads.
-- Uploads are done server-side via service role; bucket is public so returned file URLs are viewable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload (server uses service role; this allows future client uploads if needed).
CREATE POLICY "submissions_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions');

-- Allow public read so submission file URLs returned to students/lecturers work.
CREATE POLICY "submissions_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'submissions');
