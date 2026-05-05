-- Tabela principal de comissões (exclusiva do plano Clínica)
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  professional_name text not null check (char_length(professional_name) >= 2),
  service_description text,
  amount numeric(10, 2) not null check (amount > 0),
  commission_rate numeric(5, 2) not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount numeric(10, 2) not null check (commission_amount >= 0),
  service_date date not null,
  paid_at timestamptz,
  notes text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commissions_tenant_id_idx
  on public.commissions (tenant_id);

create index if not exists commissions_tenant_professional_idx
  on public.commissions (tenant_id, professional_name);

create index if not exists commissions_tenant_service_date_idx
  on public.commissions (tenant_id, service_date desc);

alter table public.commissions enable row level security;

drop policy if exists "commissions_select_same_tenant" on public.commissions;
create policy "commissions_select_same_tenant"
  on public.commissions
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "commissions_insert_owner_only" on public.commissions;
create policy "commissions_insert_owner_only"
  on public.commissions
  for insert
  to authenticated
  with check (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and tenant_id = public.current_user_tenant_id()
        and role = 'owner'
    )
  );

drop policy if exists "commissions_update_owner_only" on public.commissions;
create policy "commissions_update_owner_only"
  on public.commissions
  for update
  to authenticated
  using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and tenant_id = public.current_user_tenant_id()
        and role = 'owner'
    )
  )
  with check (
    tenant_id = public.current_user_tenant_id()
  );

drop policy if exists "commissions_delete_owner_only" on public.commissions;
create policy "commissions_delete_owner_only"
  on public.commissions
  for delete
  to authenticated
  using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and tenant_id = public.current_user_tenant_id()
        and role = 'owner'
    )
  );

create trigger set_commissions_updated_at
before update on public.commissions
for each row
execute function public.set_updated_at();
