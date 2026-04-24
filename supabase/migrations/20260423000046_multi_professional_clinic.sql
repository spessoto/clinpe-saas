-- Multi-professional Clínica plan (tier_3)
-- Allows owners to invite up to 9 staff professionals per clinic.
-- Staff users share the same tenant, see own appointments only.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. user_invites table
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_invites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id)  on delete cascade,
  email       text not null,
  token       uuid not null default gen_random_uuid() unique,
  invited_by  uuid not null references public.users(id)    on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_at     timestamptz
);

create index if not exists idx_user_invites_token     on public.user_invites(token);
create index if not exists idx_user_invites_tenant_email on public.user_invites(tenant_id, email);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RLS for user_invites
-- ────────────────────────────────────────────────────────────────────────────
alter table public.user_invites enable row level security;

-- Owners of the same tenant can manage invites
create policy "owner_manage_invites"
  on public.user_invites
  for all
  using (
    tenant_id = (
      select tenant_id from public.users
      where id = auth.uid() and role = 'owner'
    )
  )
  with check (
    tenant_id = (
      select tenant_id from public.users
      where id = auth.uid() and role = 'owner'
    )
  );

-- Anyone (including anonymous) can read a single invite by token for the join page
create policy "public_read_invite_by_token"
  on public.user_invites
  for select
  using (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. max_staff_users column on billing_plan_prices
-- ────────────────────────────────────────────────────────────────────────────
alter table public.billing_plan_prices
  add column if not exists max_staff_users integer not null default 0;

update public.billing_plan_prices
  set max_staff_users = 9
  where tier = 'tier_3';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Update handle_new_auth_user trigger to support staff invite flow
--    If raw_user_meta_data contains 'invite_token', join existing tenant as staff
--    instead of creating a new tenant.
-- ────────────────────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_token  uuid;
  v_invite        record;
  new_tenant_id   uuid;
  v_tenant_name   text;
  v_full_name     text;
  v_professional_register text;
  v_tenant_slug   text;
  v_booking_slug  text;
begin
  -- ── Staff invite path ────────────────────────────────────────────────────
  begin
    v_invite_token := (new.raw_user_meta_data ->> 'invite_token')::uuid;
  exception when others then
    v_invite_token := null;
  end;

  if v_invite_token is not null then
    select * into v_invite
      from public.user_invites
      where token = v_invite_token
        and used_at is null
        and expires_at > now()
      limit 1;

    if found then
      v_full_name := coalesce(
        new.raw_user_meta_data ->> 'full_name',
        v_invite.full_name,
        split_part(new.email, '@', 1)
      );
      v_professional_register := new.raw_user_meta_data ->> 'professional_register';
      v_booking_slug := public.generate_unique_professional_slug(v_full_name, new.id);

      insert into public.users (
        id,
        tenant_id,
        full_name,
        professional_register,
        booking_slug,
        email,
        role
      )
      values (
        new.id,
        v_invite.tenant_id,
        v_full_name,
        v_professional_register,
        v_booking_slug,
        new.email,
        'staff'
      );

      update public.user_invites
        set used_at = now()
        where id = v_invite.id;

      return new;
    end if;
    -- If invite token is provided but invalid/expired, fall through to owner path
  end if;

  -- ── Owner path (normal signup) ───────────────────────────────────────────
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
  v_tenant_slug  := public.generate_unique_tenant_slug(v_tenant_name);
  v_booking_slug := public.generate_unique_professional_slug(v_full_name, new.id);

  insert into public.tenants (
    id,
    name,
    slug,
    trial_ends_at,
    subscription_status,
    booking_page_title,
    booking_page_description
  )
  values (
    new_tenant_id,
    v_tenant_name,
    v_tenant_slug,
    now() + interval '7 days',
    'trialing',
    'Autoagendamento - ' || v_tenant_name,
    'Escolha um horario disponivel para sua consulta de podologia.'
  );

  insert into public.users (
    id,
    tenant_id,
    full_name,
    professional_register,
    booking_slug,
    email,
    role
  )
  values (
    new.id,
    new_tenant_id,
    v_full_name,
    v_professional_register,
    v_booking_slug,
    new.email,
    'owner'
  );

  -- Seed default POPs with error handling to prevent user creation from failing
  begin
    perform public.seed_default_pop_templates(new_tenant_id);
  exception when others then
    null;
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
