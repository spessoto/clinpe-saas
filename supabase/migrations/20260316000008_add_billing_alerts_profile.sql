-- Epic 6: Precificação por volume de pacientes
-- Epic 7: Perfil e uploads
-- Epic 9: Alertas de risco

-- 1. Atualizar tabela tenants com billing
ALTER TABLE tenants 
ADD COLUMN billing_tier VARCHAR DEFAULT 'free_trial' CHECK (billing_tier IN ('free_trial', 'tier_1', 'tier_2', 'tier_3')),
ADD COLUMN max_patients_allowed INTEGER DEFAULT 10,
ADD COLUMN stripe_customer_id VARCHAR UNIQUE;

CREATE INDEX idx_tenants_billing_tier ON tenants(billing_tier);
CREATE INDEX idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);

-- 2. Atualizar tabela users com perfil
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR,
ADD COLUMN bio TEXT;

-- 3. Atualizar tabela patients com alertas clínicos
ALTER TABLE patients
ADD COLUMN health_alerts TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN referral_source VARCHAR;

CREATE INDEX idx_patients_health_alerts ON patients USING GIN(health_alerts);

-- Adicionar comentário para documentação
COMMENT ON COLUMN tenants.billing_tier IS 'Tier de assinatura: free_trial, tier_1, tier_2, tier_3';
COMMENT ON COLUMN tenants.max_patients_allowed IS 'Limite de pacientes permitidos para este tenant';
COMMENT ON COLUMN tenants.stripe_customer_id IS 'ID do cliente no Stripe para processar pagamentos';
COMMENT ON COLUMN users.avatar_url IS 'URL do avatar do profissional no Supabase Storage';
COMMENT ON COLUMN users.bio IS 'Resumo profissional exibido na página pública';
COMMENT ON COLUMN patients.health_alerts IS 'Array de alertas clínicos (ex: Diabético, Hemofílico)';
COMMENT ON COLUMN patients.referral_source IS 'Como o paciente foi indicado/descobriu a clínica';
