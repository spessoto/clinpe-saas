-- Epic 8: Integração Mercado Pago + Assinaturas
-- Adiciona colunas para rastrear assinaturas do Mercado Pago

ALTER TABLE tenants
ADD COLUMN mp_subscription_id VARCHAR,
ADD COLUMN mp_payer_email VARCHAR;

CREATE INDEX idx_tenants_mp_subscription_id ON tenants(mp_subscription_id);

COMMENT ON COLUMN tenants.mp_subscription_id IS 'ID da assinatura (preapproval) no Mercado Pago';
COMMENT ON COLUMN tenants.mp_payer_email IS 'E-mail do pagador registrado no Mercado Pago';
