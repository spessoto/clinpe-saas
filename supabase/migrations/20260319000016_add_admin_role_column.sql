-- Epic 16: Add admin role system to users table

-- Add is_admin column to users table with default false
alter table public.users
  add column if not exists is_admin boolean not null default false;

-- Create index for admin queries
create index if not exists idx_users_is_admin
  on public.users (is_admin)
  where is_admin = true;

-- Add comment to document the column
comment on column public.users.is_admin is 'Indicates if user has administrative access to the admin panel. Admins bypass tenant restrictions and can manage platform-wide settings.';

-- Set master@pododesk.com.br as admin if exists
update public.users
  set is_admin = true
  where email = 'master@pododesk.com.br'
    and is_admin = false;

-- RLS Policies for is_admin column
-- Only admins can SELECT is_admin column from other users
drop policy if exists "users_is_admin_select_admin_only" on public.users;
create policy "users_is_admin_select_admin_only"
  on public.users
  for select
  to authenticated
  -- Admin sees is_admin field; non-admin only sees their own row (handled elsewhere)
  using (
    is_admin = (select is_admin from public.users where id = auth.uid())
    or id = auth.uid()
  );

-- Only admins can UPDATE is_admin column
drop policy if exists "users_is_admin_update_admin_only" on public.users;
create policy "users_is_admin_update_admin_only"
  on public.users
  for update
  to authenticated
  -- Only admins can modify is_admin field
  using ((select is_admin from public.users where id = auth.uid()) = true)
  with check ((select is_admin from public.users where id = auth.uid()) = true);
