-- =============================================================================
-- Migration: Assign & Protect Admin Role for User ID 85b0dea3-99b6-40cd-903e-e52d708583e5
-- =============================================================================

-- 1. Grant admin role in auth.users app_metadata & user_metadata for User ID 85b0dea3-99b6-40cd-903e-e52d708583e5
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_protected": true}'::jsonb
where id = '85b0dea3-99b6-40cd-903e-e52d708583e5';

-- 2. Create security function to check if requesting user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- 3. Ensure profiles RLS restricts reading profiles: users can read their own, admins can read all
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Admins or owners can read profiles" on public.profiles;

create policy "Admins or owners can read profiles"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id or public.is_admin()
  );

-- 4. Prevent non-admin users from reading admin activity or identity records
drop policy if exists "Users can view their own activity" on public.account_activities;
create policy "Users can view their own activity"
  on public.account_activities for select
  to authenticated
  using (
    (select auth.uid()) = user_id or public.is_admin()
  );
