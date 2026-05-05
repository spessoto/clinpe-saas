alter table public.tenants
  alter column trial_ends_at set default (now() + interval '14 days');

alter table public.billing_plan_prices
  add column if not exists overage_slot_amount numeric(10,2);

update public.billing_plan_prices
set label = 'Essencial'
where tier = 'tier_1';
