-- Sprint 3 base: recorrencia financeira e importacoes em lote

create table if not exists public.recurring_financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.financial_transaction_type not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  description text,
  payment_method text,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  next_occurrence_on date not null,
  active boolean not null default true,
  last_generated_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source text not null default 'csv',
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_message text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_financial_transactions_tenant_idx
  on public.recurring_financial_transactions (tenant_id, active, next_occurrence_on);
create index if not exists financial_import_batches_tenant_idx
  on public.financial_import_batches (tenant_id, created_at desc);

alter table public.recurring_financial_transactions enable row level security;
alter table public.financial_import_batches enable row level security;

drop trigger if exists set_recurring_financial_transactions_updated_at on public.recurring_financial_transactions;
create trigger set_recurring_financial_transactions_updated_at
  before update on public.recurring_financial_transactions
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_financial_import_batches_updated_at on public.financial_import_batches;
create trigger set_financial_import_batches_updated_at
  before update on public.financial_import_batches
  for each row
  execute function public.set_updated_at();

drop policy if exists "recurring_financial_transactions_select_same_tenant" on public.recurring_financial_transactions;
create policy "recurring_financial_transactions_select_same_tenant"
  on public.recurring_financial_transactions
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "recurring_financial_transactions_insert_same_tenant" on public.recurring_financial_transactions;
create policy "recurring_financial_transactions_insert_same_tenant"
  on public.recurring_financial_transactions
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "recurring_financial_transactions_update_same_tenant" on public.recurring_financial_transactions;
create policy "recurring_financial_transactions_update_same_tenant"
  on public.recurring_financial_transactions
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "recurring_financial_transactions_delete_same_tenant" on public.recurring_financial_transactions;
create policy "recurring_financial_transactions_delete_same_tenant"
  on public.recurring_financial_transactions
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_import_batches_select_same_tenant" on public.financial_import_batches;
create policy "financial_import_batches_select_same_tenant"
  on public.financial_import_batches
  for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_import_batches_insert_same_tenant" on public.financial_import_batches;
create policy "financial_import_batches_insert_same_tenant"
  on public.financial_import_batches
  for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_import_batches_update_same_tenant" on public.financial_import_batches;
create policy "financial_import_batches_update_same_tenant"
  on public.financial_import_batches
  for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "financial_import_batches_delete_same_tenant" on public.financial_import_batches;
create policy "financial_import_batches_delete_same_tenant"
  on public.financial_import_batches
  for delete
  to authenticated
  using (tenant_id = public.current_user_tenant_id());
