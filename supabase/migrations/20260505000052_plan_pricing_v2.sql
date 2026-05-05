-- Update billing plan prices to match new pricing structure:
-- Essencial: R$ 49,90/mês (R$ 538,90/ano), overage R$ 2,00/paciente
-- Pro:       R$ 99,90/mês (R$ 1.078,90/ano), overage R$ 1,50/paciente

update public.billing_plan_prices
set
  monthly_amount      = 49.90,
  annual_amount       = 538.90,
  overage_slot_amount = 2.00
where tier = 'tier_1';

update public.billing_plan_prices
set
  monthly_amount      = 99.90,
  annual_amount       = 1078.90,
  overage_slot_amount = 1.50
where tier = 'tier_2';
