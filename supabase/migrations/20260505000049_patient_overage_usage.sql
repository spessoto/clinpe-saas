create table if not exists public.patient_overage_usage_monthly (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  billing_period_start date not null,
  billing_period_end date not null,
  plan_tier text not null,
  included_patients integer not null,
  peak_patients integer not null default 0,
  overage_patients integer not null default 0,
  overage_slot_amount numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_overage_usage_monthly_unique_period
    unique (tenant_id, billing_period_start),
  constraint patient_overage_usage_monthly_non_negative_counts
    check (
      included_patients >= 0
      and peak_patients >= 0
      and overage_patients >= 0
    ),
  constraint patient_overage_usage_monthly_valid_period
    check (billing_period_end > billing_period_start)
);

create index if not exists patient_overage_usage_monthly_tenant_period_idx
  on public.patient_overage_usage_monthly (tenant_id, billing_period_start desc);

alter table public.patient_overage_usage_monthly enable row level security;

drop policy if exists "patient_overage_usage_monthly_select_same_tenant"
  on public.patient_overage_usage_monthly;
create policy "patient_overage_usage_monthly_select_same_tenant"
  on public.patient_overage_usage_monthly
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "patient_overage_usage_monthly_insert_same_tenant"
  on public.patient_overage_usage_monthly;
create policy "patient_overage_usage_monthly_insert_same_tenant"
  on public.patient_overage_usage_monthly
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "patient_overage_usage_monthly_update_same_tenant"
  on public.patient_overage_usage_monthly;
create policy "patient_overage_usage_monthly_update_same_tenant"
  on public.patient_overage_usage_monthly
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

create trigger set_patient_overage_usage_monthly_updated_at
before update on public.patient_overage_usage_monthly
for each row
execute function public.set_updated_at();
