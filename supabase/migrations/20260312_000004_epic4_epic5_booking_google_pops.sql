-- Epic 4 + 5: Google Calendar, public booking and POP templates

create extension if not exists unaccent;

create or replace function public.slugify(input_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input_text, 'tenant'))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.generate_unique_tenant_slug(base_name text)
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
    base_slug := 'tenant';
  end if;

  candidate := base_slug;

  while exists (select 1 from public.tenants t where t.slug = candidate) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

alter table public.tenants
  add column if not exists slug text,
  add column if not exists booking_enabled boolean not null default true,
  add column if not exists booking_page_title text,
  add column if not exists booking_page_description text;

update public.tenants
set slug = public.generate_unique_tenant_slug(name)
where slug is null or slug = '';

alter table public.tenants
  alter column slug set not null;

create unique index if not exists tenants_slug_unique on public.tenants (slug);

create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  google_email text,
  access_token text,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.pop_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  content text not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_integrations_tenant_idx on public.google_integrations (tenant_id);
create index if not exists pop_documents_tenant_idx on public.pop_documents (tenant_id);
create index if not exists pop_documents_template_idx on public.pop_documents (tenant_id, is_template);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_google_integrations_updated_at on public.google_integrations;
create trigger set_google_integrations_updated_at
  before update on public.google_integrations
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_pop_documents_updated_at on public.pop_documents;
create trigger set_pop_documents_updated_at
  before update on public.pop_documents
  for each row
  execute function public.set_updated_at();

alter table public.google_integrations enable row level security;
alter table public.pop_documents enable row level security;

drop policy if exists "google_integrations_select_same_tenant" on public.google_integrations;
create policy "google_integrations_select_same_tenant"
  on public.google_integrations
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "google_integrations_insert_same_tenant" on public.google_integrations;
create policy "google_integrations_insert_same_tenant"
  on public.google_integrations
  for insert
  to authenticated
  with check (
    tenant_id = public.current_user_tenant_id()
    and user_id = auth.uid()
  );

drop policy if exists "google_integrations_update_same_tenant" on public.google_integrations;
create policy "google_integrations_update_same_tenant"
  on public.google_integrations
  for update
  to authenticated
  using (
    tenant_id = public.current_user_tenant_id()
    and user_id = auth.uid()
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and user_id = auth.uid()
  );

drop policy if exists "google_integrations_delete_same_tenant" on public.google_integrations;
create policy "google_integrations_delete_same_tenant"
  on public.google_integrations
  for delete
  to authenticated
  using (
    tenant_id = public.current_user_tenant_id()
    and user_id = auth.uid()
  );

drop policy if exists "pop_documents_select_same_tenant" on public.pop_documents;
create policy "pop_documents_select_same_tenant"
  on public.pop_documents
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "pop_documents_insert_same_tenant" on public.pop_documents;
create policy "pop_documents_insert_same_tenant"
  on public.pop_documents
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "pop_documents_update_same_tenant" on public.pop_documents;
create policy "pop_documents_update_same_tenant"
  on public.pop_documents
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "pop_documents_delete_same_tenant" on public.pop_documents;
create policy "pop_documents_delete_same_tenant"
  on public.pop_documents
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

create or replace function public.seed_default_pop_templates(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pop_documents (tenant_id, title, content, is_template)
  select p_tenant_id, template.title, template.content, true
  from (
    values
      (
        'POP - Limpeza de Instrumentais',
        E'POP - LIMPEZA DE INSTRUMENTAIS\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Separar instrumentais utilizados em area de descontaminacao.\n2. Lavar com agua corrente e detergente enzimatico.\n3. Escovar articulacoes e superfices criticas.\n4. Secar completamente antes da esterilizacao.\n5. Registrar lote, data e responsavel no controle interno.'
      ),
      (
        'POP - Esterilizacao',
        E'POP - ESTERILIZACAO\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Conferir limpeza previa do material.\n2. Embalar e identificar o instrumental.\n3. Inserir em autoclave conforme carga recomendada.\n4. Validar indicadores quimicos e biologicos.\n5. Armazenar em local limpo, seco e identificado.'
      ),
      (
        'POP - Atendimento Inicial',
        E'POP - ATENDIMENTO INICIAL\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Confirmar identificacao do paciente.\n2. Realizar anamnese e avaliacao clinica inicial.\n3. Higienizar area e instrumentais antes do procedimento.\n4. Registrar condutas e orientacoes no prontuario.\n5. Agendar retorno quando necessario.'
      )
  ) as template(title, content)
  where not exists (
    select 1
    from public.pop_documents d
    where d.tenant_id = p_tenant_id
      and d.title = template.title
      and d.is_template = true
  );
end;
$$;

select public.seed_default_pop_templates(id)
from public.tenants;

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

  perform public.seed_default_pop_templates(new_tenant_id);

  return new;
end;
$$;
