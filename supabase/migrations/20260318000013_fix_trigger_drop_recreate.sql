-- Fix: drop + recreate trigger function to clear PG function cache
-- Needed because 'create or replace' may have retained cached plan
-- preventing booking_slug from being populated.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

create function public.handle_new_auth_user()
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
  v_booking_slug text;
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

  perform public.seed_default_pop_templates(new_tenant_id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
