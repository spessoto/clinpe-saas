-- Adiciona método de cobrança da assinatura ativa ao tenant.
-- Permite identificar se há débito automático via cartão (CREDIT_CARD),
-- o que suprime o banner de aviso de renovação inminente.

alter table public.tenants
  add column if not exists subscription_billing_method text
    check (subscription_billing_method in ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED'));

comment on column public.tenants.subscription_billing_method
  is 'Método de cobrança da assinatura ativa: BOLETO, CREDIT_CARD, PIX ou UNDEFINED. '
     'Quando CREDIT_CARD, o débito é automático e não é necessário exibir aviso de renovação.';
