-- Add title/role for each signatory (e.g. "Founder and President", "Chancellor").
ALTER TABLE certificate_settings ADD COLUMN IF NOT EXISTS signature1_title TEXT;
ALTER TABLE certificate_settings ADD COLUMN IF NOT EXISTS signature2_title TEXT;
