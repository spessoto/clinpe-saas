-- Epic 10 (Milestone A): base operacional (esterilizacao) + financeiro

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'financial_transaction_type'
      and n.nspname = 'public'
  ) then
    create type public.financial_transaction_type as enum ('income', 'expense');
  end if;
end
$$;

create table if not exists public.sterilization_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  material_name text not null,
  method text,
  cycle_code text,
  responsible_name text,
  sterilized_at timestamptz not null,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.financial_transaction_type not null,
  amount numeric(12,2) not null check (amount > 0),
  category text,
  description text,
  payment_method text,
  occurred_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sterilization_logs_tenant_id_idx
  on public.sterilization_logs (tenant_id);
create index if not exists sterilization_logs_sterilized_at_idx
  on public.sterilization_logs (sterilized_at desc);

create index if not exists financial_transactions_tenant_id_idx
  on public.financial_transactions (tenant_id);
create index if not exists financial_transactions_occurred_on_idx
  on public.financial_transactions (occurred_on desc);
create index if not exists financial_transactions_tenant_type_idx
  on public.financial_transactions (tenant_id, type);

drop trigger if exists set_sterilization_logs_updated_at on public.sterilization_logs;
create trigger set_sterilization_logs_updated_at
  before update on public.sterilization_logs
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_financial_transactions_updated_at on public.financial_transactions;
create trigger set_financial_transactions_updated_at
  before update on public.financial_transactions
  for each row
  execute function public.set_updated_at();

alter table public.sterilization_logs enable row level security;
alter table public.financial_transactions enable row level security;

drop policy if exists "sterilization_logs_select_same_tenant" on public.sterilization_logs;
create policy "sterilization_logs_select_same_tenant"
  on public.sterilization_logs
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_logs_insert_same_tenant" on public.sterilization_logs;
create policy "sterilization_logs_insert_same_tenant"
  on public.sterilization_logs
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_logs_update_same_tenant" on public.sterilization_logs;
create policy "sterilization_logs_update_same_tenant"
  on public.sterilization_logs
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "sterilization_logs_delete_same_tenant" on public.sterilization_logs;
create policy "sterilization_logs_delete_same_tenant"
  on public.sterilization_logs
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_transactions_select_same_tenant" on public.financial_transactions;
create policy "financial_transactions_select_same_tenant"
  on public.financial_transactions
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_transactions_insert_same_tenant" on public.financial_transactions;
create policy "financial_transactions_insert_same_tenant"
  on public.financial_transactions
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_transactions_update_same_tenant" on public.financial_transactions;
create policy "financial_transactions_update_same_tenant"
  on public.financial_transactions
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_transactions_delete_same_tenant" on public.financial_transactions;
create policy "financial_transactions_delete_same_tenant"
  on public.financial_transactions
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());