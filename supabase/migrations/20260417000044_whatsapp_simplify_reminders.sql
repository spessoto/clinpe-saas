-- ============================================================
-- Migration: Simplify WhatsApp — Reminder-Only with Templates
-- Removes chat/contacts/messages, adds configurable templates
-- ============================================================

-- 1. Create reminder templates table (up to 3 per tenant)
CREATE TABLE IF NOT EXISTS whatsapp_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Lembrete',
  message_template TEXT NOT NULL,
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'hours_before'
    CHECK (trigger_type IN ('hours_before', 'days_before')),
  trigger_value INTEGER NOT NULL DEFAULT 24
    CHECK (trigger_value > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, position)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reminder_templates_tenant
  ON whatsapp_reminder_templates(tenant_id);

-- 2. Create reminders sent tracking table (dedup per appointment + template)
CREATE TABLE IF NOT EXISTS whatsapp_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES whatsapp_reminder_templates(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_sent_appt
  ON whatsapp_reminders_sent(appointment_id);

-- 3. RLS for whatsapp_reminder_templates
ALTER TABLE whatsapp_reminder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_templates_select ON whatsapp_reminder_templates
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_templates_insert ON whatsapp_reminder_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_templates_update ON whatsapp_reminder_templates
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_templates_delete ON whatsapp_reminder_templates
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

-- 4. RLS for whatsapp_reminders_sent (read-only via join; writes by service_role)
ALTER TABLE whatsapp_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_sent_select ON whatsapp_reminders_sent
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND a.tenant_id = current_user_tenant_id()
    )
  );

-- 5. Remove old appointment reminder column (replaced by whatsapp_reminders_sent)
ALTER TABLE appointments
  DROP COLUMN IF EXISTS whatsapp_reminder_sent_at;

-- 6. Drop chat-related tables (no longer needed)
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_contacts CASCADE;

-- 7. Drop storage bucket policies (bucket itself must be deleted via Supabase Dashboard)
DROP POLICY IF EXISTS whatsapp_media_select ON storage.objects;
DROP POLICY IF EXISTS whatsapp_media_insert ON storage.objects;
DROP POLICY IF EXISTS whatsapp_media_delete ON storage.objects;

-- 8. Seed: insert a default template for tenants that already have WhatsApp connected
INSERT INTO whatsapp_reminder_templates (tenant_id, name, message_template, trigger_type, trigger_value, enabled, position)
SELECT
  id,
  'Lembrete 24h',
  E'Olá, {{paciente}}! 👋\n\nLembramos que você tem uma consulta agendada:\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAgradecemos a preferência!',
  'hours_before',
  24,
  true,
  1
FROM tenants
WHERE evolution_instance_name IS NOT NULL
ON CONFLICT (tenant_id, position) DO NOTHING;
