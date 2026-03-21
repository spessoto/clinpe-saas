-- Repair: adiciona colunas que deveriam ter sido criadas pela migração 08
-- mas não estão presentes no banco remoto.
-- Usa IF NOT EXISTS para ser idempotente.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_tier VARCHAR DEFAULT 'free_trial'
    CHECK (billing_tier IN ('free_trial', 'tier_1', 'tier_2', 'tier_3')),
  ADD COLUMN IF NOT EXISTS max_patients_allowed INTEGER DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_tenants_billing_tier ON public.tenants (billing_tier);

COMMENT ON COLUMN public.tenants.billing_tier IS 'Tier de assinatura: free_trial, tier_1, tier_2, tier_3';
COMMENT ON COLUMN public.tenants.max_patients_allowed IS 'Limite de pacientes permitidos para este tenant';

-- Colunas de perfil no users (também da migração 08)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;
