-- Sync profile from auth.users metadata (phone, id_number, first_name, last_name, email) on signup.
-- Ensures phone and id_number from registration are saved to profiles.

-- Ensure profiles has phone and id_number columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, id_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.email, ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'id_number'), ''),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), profiles.first_name),
    last_name = COALESCE(NULLIF(TRIM(EXCLUDED.last_name), ''), profiles.last_name),
    email = COALESCE(NULLIF(TRIM(EXCLUDED.email), ''), profiles.email),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), profiles.phone),
    id_number = COALESCE(NULLIF(TRIM(EXCLUDED.id_number), ''), profiles.id_number);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present (may have different name)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
