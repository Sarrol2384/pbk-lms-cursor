-- Certificate branding: logo and signatures (one row per tenant / institution).
CREATE TABLE IF NOT EXISTS certificate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL DEFAULT 'PBK University',
  logo_url TEXT,
  signature1_url TEXT,
  signature1_name TEXT,
  signature2_url TEXT,
  signature2_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton row for default settings.
INSERT INTO certificate_settings (institution_name)
SELECT 'PBK University'
WHERE NOT EXISTS (SELECT 1 FROM certificate_settings);

ALTER TABLE certificate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificate_settings_admin" ON certificate_settings FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'admin'))
  );

COMMENT ON TABLE certificate_settings IS 'Logo and signature URLs for certificate PDF; editable by super_admin/admin.';

-- Storage bucket for certificate logo and signature images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-assets', 'certificate-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "certificate_assets_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'certificate-assets');

CREATE POLICY "certificate_assets_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'certificate-assets');
