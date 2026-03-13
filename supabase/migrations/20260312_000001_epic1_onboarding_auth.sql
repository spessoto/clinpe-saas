-- Epic 1: Onboarding + Auth (multi-tenant)
-- Run this migration in Supabase SQL editor or via Supabase CLI.

create extension if not exists pgcrypto;

-- Enums keep state values constrained to spec.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'subscription_status'
      and n.nspname = 'public'
  ) then
    create type public.subscription_status as enum ('trialing', 'active', 'past_due');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role'
      and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('owner', 'staff');
  end if;
end
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  subscription_status public.subscription_status not null default 'trialing',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  full_name text not null,
  professional_register text,
  email text not null,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now()
);

create unique index if not exists users_email_unique on public.users (email);
create index if not exists users_tenant_id_idx on public.users (tenant_id);
create index if not exists tenants_subscription_status_idx on public.tenants (subscription_status);
create index if not exists tenants_trial_ends_at_idx on public.tenants (trial_ends_at);

create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.tenant_id
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_tenant_access_active(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    t.subscription_status = 'active'
    or now() <= t.trial_ends_at
  from public.tenants t
  where t.id = p_tenant_id;
$$;

alter table public.tenants enable row level security;
alter table public.users enable row level security;

-- Tenants are visible only inside the tenant boundary.
drop policy if exists "tenants_select_own" on public.tenants;
create policy "tenants_select_own"
  on public.tenants
  for select
  to authenticated
  using (id = public.current_user_tenant_id());

drop policy if exists "tenants_update_own" on public.tenants;
create policy "tenants_update_own"
  on public.tenants
  for update
  to authenticated
  using (id = public.current_user_tenant_id())
  with check (id = public.current_user_tenant_id());

-- Users are tenant-scoped. Staff can list users in their own tenant.
drop policy if exists "users_select_same_tenant" on public.users;
create policy "users_select_same_tenant"
  on public.users
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- A user can update only their own profile row.
drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users
  for update
  to authenticated
  using (id = auth.uid() and tenant_id = public.current_user_tenant_id())
  with check (id = auth.uid() and tenant_id = public.current_user_tenant_id());

-- On signup: create tenant and owner profile automatically.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  v_tenant_name text;
  v_full_name text;
  v_professional_register text;
begin
  new_tenant_id := gen_random_uuid();

  v_tenant_name := coalesce(
    new.raw_user_meta_data ->> 'clinic_name',
    new.raw_user_meta_data ->> 'tenant_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_professional_register := new.raw_user_meta_data ->> 'professional_register';

  insert into public.tenants (id, name, trial_ends_at, subscription_status)
  values (new_tenant_id, v_tenant_name, now() + interval '7 days', 'trialing');

  insert into public.users (
    id,
    tenant_id,
    full_name,
    professional_register,
    email,
    role
  )
  values (
    new.id,
    new_tenant_id,
    v_full_name,
    v_professional_register,
    new.email,
    'owner'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
