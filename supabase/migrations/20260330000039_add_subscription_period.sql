-- Adiciona campo que rastreia se a assinatura ativa é mensal ou anual.
-- Populado pelo webhook do Asaas ao receber o 4º campo do externalReference.
-- Valor NULL indica assinatura anterior à migration ou tenant ainda em trial.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_period text
    CHECK (subscription_period IN ('monthly', 'annual'));

COMMENT ON COLUMN public.tenants.subscription_period
  IS 'Período de cobrança da assinatura ativa: monthly ou annual. '
     'Populado pelo webhook Asaas via externalReference (campo 4).';

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_period
  ON public.tenants (subscription_period);
