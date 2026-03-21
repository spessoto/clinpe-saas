-- Epic admin pricing: source-of-truth for plan values used across billing and landing

create table if not exists public.billing_plan_prices (
  tier text primary key check (tier in ('tier_1', 'tier_2', 'tier_3')),
  label text not null,
  max_patients integer not null check (max_patients > 0),
  monthly_amount numeric(10,2) not null check (monthly_amount > 0),
  annual_amount numeric(10,2) not null check (annual_amount > 0),
  updated_at timestamptz not null default now(),
  updated_by_email text
);

create or replace function public.set_billing_plan_prices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_billing_plan_prices_updated_at on public.billing_plan_prices;
create trigger trg_billing_plan_prices_updated_at
before update on public.billing_plan_prices
for each row
execute function public.set_billing_plan_prices_updated_at();

insert into public.billing_plan_prices (tier, label, max_patients, monthly_amount, annual_amount)
values
  ('tier_1', 'Starter', 50, 99.90, 1078.90),
  ('tier_2', 'Pro', 100, 149.90, 1618.90),
  ('tier_3', 'Clínica', 150, 199.90, 2158.90)
on conflict (tier) do update
set
  label = excluded.label,
  max_patients = excluded.max_patients,
  monthly_amount = excluded.monthly_amount,
  annual_amount = excluded.annual_amount;
