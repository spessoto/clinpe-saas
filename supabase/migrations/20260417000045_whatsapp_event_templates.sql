-- ============================================================
-- Migration: WhatsApp Event Templates (booking/confirmation/cancellation)
-- Separate from reminder templates — one per event type per tenant
-- ============================================================

-- 1. Create event templates table (max 3 per tenant: booking, confirmation, cancellation)
CREATE TABLE IF NOT EXISTS whatsapp_event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('booking', 'confirmation', 'cancellation')),
  message_template TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_event_templates_tenant
  ON whatsapp_event_templates(tenant_id);

-- 2. RLS
ALTER TABLE whatsapp_event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_event_tpl_select ON whatsapp_event_templates
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_event_tpl_insert ON whatsapp_event_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_event_tpl_update ON whatsapp_event_templates
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_event_tpl_delete ON whatsapp_event_templates
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );
