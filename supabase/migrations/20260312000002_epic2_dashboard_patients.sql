-- Epic 2: Dashboard + Patients
-- Tables needed for KPIs and patients CRUD/history.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'appointment_status'
      and n.nspname = 'public'
  ) then
    create type public.appointment_status as enum ('scheduled', 'completed', 'canceled');
  end if;
end
$$;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  phone text not null,
  birth_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.users (id) on delete restrict,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  anamnesis_data jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  created_at timestamptz not null default now()
);

create index if not exists patients_tenant_id_idx on public.patients (tenant_id);
create index if not exists patients_name_idx on public.patients (name);
create index if not exists patients_phone_idx on public.patients (phone);

create index if not exists appointments_tenant_id_idx on public.appointments (tenant_id);
create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);

create index if not exists records_tenant_id_idx on public.medical_records (tenant_id);
create index if not exists records_patient_id_idx on public.medical_records (patient_id);

create index if not exists materials_tenant_id_idx on public.materials (tenant_id);

alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.materials enable row level security;

-- Patients policies
drop policy if exists "patients_select_same_tenant" on public.patients;
create policy "patients_select_same_tenant"
  on public.patients
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "patients_insert_same_tenant" on public.patients;
create policy "patients_insert_same_tenant"
  on public.patients
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "patients_update_same_tenant" on public.patients;
create policy "patients_update_same_tenant"
  on public.patients
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "patients_delete_same_tenant" on public.patients;
create policy "patients_delete_same_tenant"
  on public.patients
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- Appointments policies
drop policy if exists "appointments_select_same_tenant" on public.appointments;
create policy "appointments_select_same_tenant"
  on public.appointments
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "appointments_insert_same_tenant" on public.appointments;
create policy "appointments_insert_same_tenant"
  on public.appointments
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "appointments_update_same_tenant" on public.appointments;
create policy "appointments_update_same_tenant"
  on public.appointments
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "appointments_delete_same_tenant" on public.appointments;
create policy "appointments_delete_same_tenant"
  on public.appointments
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- Medical records policies
drop policy if exists "records_select_same_tenant" on public.medical_records;
create policy "records_select_same_tenant"
  on public.medical_records
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "records_insert_same_tenant" on public.medical_records;
create policy "records_insert_same_tenant"
  on public.medical_records
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "records_update_same_tenant" on public.medical_records;
create policy "records_update_same_tenant"
  on public.medical_records
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "records_delete_same_tenant" on public.medical_records;
create policy "records_delete_same_tenant"
  on public.medical_records
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- Materials policies
drop policy if exists "materials_select_same_tenant" on public.materials;
create policy "materials_select_same_tenant"
  on public.materials
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "materials_insert_same_tenant" on public.materials;
create policy "materials_insert_same_tenant"
  on public.materials
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "materials_update_same_tenant" on public.materials;
create policy "materials_update_same_tenant"
  on public.materials
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "materials_delete_same_tenant" on public.materials;
create policy "materials_delete_same_tenant"
  on public.materials
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());
