# Base schema is not in this repo

Migrations in `supabase/migrations` start at `00004`. Tables such as `profiles`, `courses`, `modules`, `enrollments`, `assessments`, and `submissions` were created in the live Supabase project and were never committed. Later migrations only alter those tables. A fresh database cannot be rebuilt from this repo alone.

Cyril needs to export the **live public schema** (structure only, no student data) and commit it as the missing base migration.

Do this from a machine that can reach the Supabase database. Do not paste the database password into chat or commit it.

## Option A — Supabase CLI

```bash
npm install -g supabase

supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase db dump --linked --schema public -f supabase/migrations/00001_base_schema.sql
```

`YOUR_PROJECT_REF` is the id in the project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`.

## Option B — pg_dump

In the Supabase dashboard open **Project Settings → Database** and copy the URI connection string. Then:

```bash
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=supabase/migrations/00001_base_schema.sql
```

## After the dump

1. Open `supabase/migrations/00001_base_schema.sql` and confirm it is schema only (no `COPY` of student rows, no passwords).
2. Commit that file. Leave `00004` and later migrations as they are; they are the changes already applied on top of the live database.
3. Do not dump the `auth` schema into a migration you plan to replay. Supabase owns `auth.users`.

Until that file exists, applying only the files in this repo will not create a working database.

## Role changes

`00026_profiles_role_and_id_number.sql` stops a student from updating `profiles.role`. It adds a restrictive RLS `WITH CHECK` and a trigger. Admins and the service role can still change roles. SA ID numbers are stored on `profiles.id_number`, not in auth user metadata.
