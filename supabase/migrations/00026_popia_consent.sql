-- Record POPIA consent captured at signup.
-- Apply after 00025. Signup also writes the same values into auth user metadata
-- so consent exists even if this migration has not been applied yet.
-- The trigger copies metadata onto the profile once these columns exist.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS popia_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS popia_consent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, first_name, last_name, email, phone, id_number, role, popia_consent, popia_consent_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.email, ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'id_number'), ''),
    'student',
    COALESCE((NEW.raw_user_meta_data->>'popia_consent')::boolean, false),
    NULLIF(NEW.raw_user_meta_data->>'popia_consent_at', '')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), profiles.first_name),
    last_name = COALESCE(NULLIF(TRIM(EXCLUDED.last_name), ''), profiles.last_name),
    email = COALESCE(NULLIF(TRIM(EXCLUDED.email), ''), profiles.email),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), profiles.phone),
    id_number = COALESCE(NULLIF(TRIM(EXCLUDED.id_number), ''), profiles.id_number),
    popia_consent = profiles.popia_consent OR EXCLUDED.popia_consent,
    popia_consent_at = COALESCE(profiles.popia_consent_at, EXCLUDED.popia_consent_at);
  RETURN NEW;
END;
$$;
