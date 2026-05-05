-- Fix Pro plan: max_patients should be 150, not 100
update public.billing_plan_prices
set max_patients = 150
where tier = 'tier_2';
