begin;

-- Critical: enable RLS on public tables exposed through PostgREST.
alter table if exists public.billing_plan_prices enable row level security;
alter table if exists public.email_queue enable row level security;

-- Warning: extension should not live in public schema.
create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent'
      and n.nspname <> 'extensions'
  ) then
    alter extension unaccent set schema extensions;
  end if;
end;
$$;

-- Warning: set fixed search_path and keep explicit extension reference.
create or replace function public.slugify(input_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(
    both '-' from regexp_replace(
      lower(extensions.unaccent(coalesce(input_text, 'tenant'))),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
$$;

alter function public.set_updated_at() set search_path = public;
alter function public.set_billing_plan_prices_updated_at() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
alter function public.prevent_reassign_deleted_professional_appointments() set search_path = public;
alter function public.generate_unique_tenant_slug(text) set search_path = public;
alter function public.generate_unique_professional_slug(text, uuid) set search_path = public;

commit;
