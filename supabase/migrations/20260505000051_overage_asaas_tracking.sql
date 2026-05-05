-- Adiciona colunas de rastreamento para o ciclo de cobrança de excedente de pacientes no Asaas.
--
-- Fluxo (na fatura seguinte ao período com excedente):
--   PAYMENT_RECEIVED
--     → RESET: se há registro com applied_at IS NOT NULL e reset_at IS NULL
--              → reverter assinatura Asaas para asaas_base_amount → gravar reset_at
--     → APPLY: se há registro do mês anterior com overage_patients > 0 e applied_at IS NULL
--              → gravar asaas_base_amount (antes de chamar a API — safety net)
--              → bump assinatura Asaas = base + (overage_patients × overage_slot_amount)
--              → gravar applied_at
--
-- Mecanismo anti-corrupção:
--   • asaas_base_amount é gravado no DB ANTES da chamada Asaas
--     → se a chamada falhar, applied_at permanece NULL e o retry é limpo
--   • Recovery automático: se applied_at IS NULL mas asaas_base_amount IS NOT NULL
--     → o webhook compara o valor atual da assinatura com base + overage
--     → se já está bumped, apenas marca applied_at sem nova chamada à API
--   • Mesmo mecanismo de recovery para reset_at

alter table public.patient_overage_usage_monthly
  add column if not exists asaas_base_amount     numeric(10,2),
  add column if not exists asaas_applied_at      timestamptz,
  add column if not exists asaas_reset_at        timestamptz;

comment on column public.patient_overage_usage_monthly.asaas_base_amount is
  'Valor original da assinatura Asaas antes do bump de excedente. Gravado antes da chamada à API para permitir recovery em caso de falha.';

comment on column public.patient_overage_usage_monthly.asaas_applied_at is
  'Timestamp em que o bump de excedente foi confirmado na assinatura Asaas. NULL = ainda não aplicado.';

comment on column public.patient_overage_usage_monthly.asaas_reset_at is
  'Timestamp em que a assinatura foi revertida ao valor base após o pagamento do ciclo com excedente. NULL = ainda não revertida.';
