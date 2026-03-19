-- Epic 10/8 hardening: central de esterilizacao + teste biologico + rastreabilidade em prontuario

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'sterilization_chemical_indicator_status'
      and n.nspname = 'public'
  ) then
    create type public.sterilization_chemical_indicator_status as enum ('approved', 'rejected');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'sterilization_biological_test_status'
      and n.nspname = 'public'
  ) then
    create type public.sterilization_biological_test_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

alter table public.sterilization_logs
  add column if not exists user_id uuid references public.users (id) on delete set null,
  add column if not exists batch_number text,
  add column if not exists temperature_celsius numeric(6,2),
  add column if not exists pressure_bar numeric(6,2),
  add column if not exists chemical_indicator_status public.sterilization_chemical_indicator_status;

update public.sterilization_logs
set batch_number = coalesce(batch_number, cycle_code, 'LOTE-' || upper(substr(id::text, 1, 8)))
where batch_number is null;

update public.sterilization_logs
set chemical_indicator_status = coalesce(chemical_indicator_status, 'approved'::public.sterilization_chemical_indicator_status)
where chemical_indicator_status is null;

alter table public.sterilization_logs
  alter column batch_number set not null,
  alter column chemical_indicator_status set not null;

create unique index if not exists sterilization_logs_tenant_batch_number_uidx
  on public.sterilization_logs (tenant_id, batch_number);

create table if not exists public.sterilization_biological_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sterilization_log_id uuid not null references public.sterilization_logs (id) on delete cascade,
  ampoule_lot text not null,
  incubation_started_at timestamptz not null default now(),
  read_at timestamptz,
  status public.sterilization_biological_test_status not null default 'pending',
  result_notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sterilization_biological_tests_tenant_idx
  on public.sterilization_biological_tests (tenant_id);
create index if not exists sterilization_biological_tests_cycle_idx
  on public.sterilization_biological_tests (sterilization_log_id);
create index if not exists sterilization_biological_tests_status_idx
  on public.sterilization_biological_tests (tenant_id, status, incubation_started_at);

drop trigger if exists set_sterilization_biological_tests_updated_at on public.sterilization_biological_tests;
create trigger set_sterilization_biological_tests_updated_at
  before update on public.sterilization_biological_tests
  for each row
  execute function public.set_updated_at();

create table if not exists public.medical_record_sterilization_lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  medical_record_id uuid not null references public.medical_records (id) on delete cascade,
  sterilization_log_id uuid not null references public.sterilization_logs (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (medical_record_id, sterilization_log_id)
);

create index if not exists medical_record_sterilization_lots_tenant_idx
  on public.medical_record_sterilization_lots (tenant_id);
create index if not exists medical_record_sterilization_lots_record_idx
  on public.medical_record_sterilization_lots (medical_record_id);
create index if not exists medical_record_sterilization_lots_cycle_idx
  on public.medical_record_sterilization_lots (sterilization_log_id);

alter table public.sterilization_biological_tests enable row level security;
alter table public.medical_record_sterilization_lots enable row level security;

drop policy if exists "sterilization_biological_tests_select_same_tenant" on public.sterilization_biological_tests;
create policy "sterilization_biological_tests_select_same_tenant"
  on public.sterilization_biological_tests
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_biological_tests_insert_same_tenant" on public.sterilization_biological_tests;
create policy "sterilization_biological_tests_insert_same_tenant"
  on public.sterilization_biological_tests
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_biological_tests_update_same_tenant" on public.sterilization_biological_tests;
create policy "sterilization_biological_tests_update_same_tenant"
  on public.sterilization_biological_tests
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_biological_tests_delete_same_tenant" on public.sterilization_biological_tests;
create policy "sterilization_biological_tests_delete_same_tenant"
  on public.sterilization_biological_tests
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "medical_record_sterilization_lots_select_same_tenant" on public.medical_record_sterilization_lots;
create policy "medical_record_sterilization_lots_select_same_tenant"
  on public.medical_record_sterilization_lots
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "medical_record_sterilization_lots_insert_same_tenant" on public.medical_record_sterilization_lots;
create policy "medical_record_sterilization_lots_insert_same_tenant"
  on public.medical_record_sterilization_lots
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "medical_record_sterilization_lots_update_same_tenant" on public.medical_record_sterilization_lots;
create policy "medical_record_sterilization_lots_update_same_tenant"
  on public.medical_record_sterilization_lots
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "medical_record_sterilization_lots_delete_same_tenant" on public.medical_record_sterilization_lots;
create policy "medical_record_sterilization_lots_delete_same_tenant"
  on public.medical_record_sterilization_lots
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());