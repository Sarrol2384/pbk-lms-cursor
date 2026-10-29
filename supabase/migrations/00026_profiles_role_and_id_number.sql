-- SA ID numbers belong on profiles, not in auth user_metadata (that value is
-- copied into the session JWT). Students must not be able to change profiles.role.
--
-- Who can read a profile row: the owner, and staff (admin, super_admin, lecturer).
-- Lecturers need name and email for grading. The id_number column itself is
-- revoked from anon and authenticated. Admins read it through the service role.
-- The owner can read their own number with public.my_id_number().

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Copy any ID still sitting in auth metadata, then stop accepting it there.
UPDATE public.profiles p
SET id_number = NULLIF(BTRIM(u.raw_user_meta_data->>'id_number'), '')
FROM auth.users u
WHERE p.id = u.id
  AND (p.id_number IS NULL OR BTRIM(p.id_number) = '')
  AND NULLIF(BTRIM(u.raw_user_meta_data->>'id_number'), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.strip_id_number_from_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'id_number' THEN
    NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'id_number';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strip_id_number_metadata ON auth.users;
CREATE TRIGGER strip_id_number_metadata
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.strip_id_number_from_auth_metadata();

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'id_number'
WHERE raw_user_meta_data IS NOT NULL
  AND raw_user_meta_data ? 'id_number';

-- New signups still copy name, email, and phone. They do not copy id_number.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.email, ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'phone'), ''),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(NULLIF(BTRIM(EXCLUDED.first_name), ''), profiles.first_name),
    last_name = COALESCE(NULLIF(BTRIM(EXCLUDED.last_name), ''), profiles.last_name),
    email = COALESCE(NULLIF(BTRIM(EXCLUDED.email), ''), profiles.email),
    phone = COALESCE(NULLIF(BTRIM(EXCLUDED.phone), ''), profiles.phone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'lecturer')
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_role_of(target uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = target;
$$;

CREATE OR REPLACE FUNCTION public.my_id_number()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id_number FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_role_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_id_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_role_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_id_number() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;
CREATE POLICY profiles_select_staff
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- ANDs with every existing SELECT policy, so a wide-open policy cannot leak rows.
DROP POLICY IF EXISTS profiles_select_owner_or_staff_only ON public.profiles;
CREATE POLICY profiles_select_owner_or_staff_only
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_staff());

-- ANDs with every existing UPDATE policy. Role may change only for an admin.
DROP POLICY IF EXISTS profiles_update_no_role_escalation ON public.profiles;
CREATE POLICY profiles_update_no_role_escalation
  ON public.profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (id = auth.uid() AND role IS NOT DISTINCT FROM public.profile_role_of(id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS profiles_insert_no_role_escalation ON public.profiles;
CREATE POLICY profiles_insert_no_role_escalation
  ON public.profiles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (id = auth.uid() AND role = 'student')
    OR public.is_admin()
  );

CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND (NEW.role IS NULL OR NEW.role = 'student') THEN
    IF NEW.role IS NULL THEN
      NEW.role := 'student';
    END IF;
    RETURN NEW;
  END IF;

  jwt_role := COALESCE(auth.role(), '');
  IF jwt_role = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only an administrator can change a user role'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_profile_role_change();

-- Hide the ID column from the anon and authenticated API roles.
-- service_role (admin screens) and the table owner keep it.
-- The signed-in user reads their own value with public.my_id_number().
REVOKE SELECT (id_number) ON public.profiles FROM PUBLIC, anon, authenticated;
