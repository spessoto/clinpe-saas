-- Epic 4 enhancement: public booking URL per professional + Google widget metadata

create or replace function public.generate_unique_professional_slug(
  base_name text,
  p_user_id uuid default null
)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 0;
begin
  base_slug := public.slugify(base_name);

  if base_slug = '' then
    base_slug := 'profissional';
  end if;

  candidate := base_slug;

  while exists (
    select 1
    from public.users u
    where u.booking_slug = candidate
      and (p_user_id is null or u.id <> p_user_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

alter table public.users
  add column if not exists booking_slug text;

-- Populate existing users safely with unique slugs.
do $$
declare
  r record;
begin
  for r in select id, full_name from public.users where booking_slug is null or booking_slug = '' loop
    update public.users
    set booking_slug = public.generate_unique_professional_slug(r.full_name, r.id)
    where id = r.id;
  end loop;
end;
$$;

alter table public.users
  alter column booking_slug set not null;

create unique index if not exists users_booking_slug_unique on public.users (booking_slug);

alter table public.patients
  add column if not exists email text;

alter table public.google_integrations
  add column if not exists booking_widget_url text;

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
  v_tenant_slug text;
  v_professional_slug text;
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
  v_tenant_slug := public.generate_unique_tenant_slug(v_tenant_name);
  v_professional_slug := public.generate_unique_professional_slug(v_full_name, new.id);

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
    v_professional_slug,
    new.email,
    'owner'
  );

  perform public.seed_default_pop_templates(new_tenant_id);

  return new;
end;
$$;
