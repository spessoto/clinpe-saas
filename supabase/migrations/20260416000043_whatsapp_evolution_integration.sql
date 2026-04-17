-- ============================================================
-- Migration: WhatsApp Evolution API Integration (Multi-tenant)
-- 1 Tenant = 1 Instância = 1 Token Único
-- ============================================================

-- 1. New columns on tenants for Evolution API instance tracking
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS evolution_instance_name VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS evolution_instance_token VARCHAR,
  ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR DEFAULT 'disconnected';

-- 2. WhatsApp contacts table (one per remote JID per tenant)
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  profile_picture_url TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, remote_jid)
);

-- 3. WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  direction VARCHAR NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  content TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  remote_message_id TEXT,
  status VARCHAR NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_remote_jid ON whatsapp_contacts(tenant_id, remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_patient ON whatsapp_contacts(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact ON whatsapp_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_dedup ON whatsapp_messages(remote_message_id) WHERE remote_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_evolution_instance ON tenants(evolution_instance_name) WHERE evolution_instance_name IS NOT NULL;

-- 5. Appointment reminder tracking
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at TIMESTAMPTZ;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- whatsapp_contacts: full CRUD for own tenant with active access
CREATE POLICY whatsapp_contacts_select ON whatsapp_contacts
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_contacts_insert ON whatsapp_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_contacts_update ON whatsapp_contacts
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_contacts_delete ON whatsapp_contacts
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

-- whatsapp_messages: select and insert for own tenant with active access
CREATE POLICY whatsapp_messages_select ON whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

CREATE POLICY whatsapp_messages_insert ON whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND is_tenant_access_active(tenant_id)
  );

-- ============================================================
-- Storage bucket for WhatsApp media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: same pattern as medical-images
CREATE POLICY whatsapp_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND split_part(name, '/', 1) = current_user_tenant_id()::text
  );

CREATE POLICY whatsapp_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND split_part(name, '/', 1) = current_user_tenant_id()::text
  );

CREATE POLICY whatsapp_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND split_part(name, '/', 1) = current_user_tenant_id()::text
  );
