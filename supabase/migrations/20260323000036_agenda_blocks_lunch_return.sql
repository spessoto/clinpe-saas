-- Phase 1: is_return on appointments, agenda_blocks table, lunch columns on users

-- 1. Add is_return flag to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_return boolean NOT NULL DEFAULT false;

-- 2. Add lunch break columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lunch_start_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lunch_end_time time DEFAULT NULL;

-- 3. Create agenda_blocks table
CREATE TABLE IF NOT EXISTS public.agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_blocks_valid_range CHECK (ends_at > starts_at)
);

-- Index for querying blocks by professional + date range
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_professional_range
  ON public.agenda_blocks (tenant_id, professional_id, starts_at, ends_at);

-- 4. RLS
ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;

-- Professionals can view blocks in their tenant
CREATE POLICY "Users can view own tenant agenda blocks"
  ON public.agenda_blocks FOR SELECT
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u WHERE u.auth_id = auth.uid()
    )
  );

-- Professionals can insert blocks for themselves
CREATE POLICY "Users can insert own agenda blocks"
  ON public.agenda_blocks FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u WHERE u.auth_id = auth.uid()
    )
    AND professional_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()
    )
  );

-- Professionals can delete their own blocks; admins can delete any block in tenant
CREATE POLICY "Users can delete own agenda blocks"
  ON public.agenda_blocks FOR DELETE
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u WHERE u.auth_id = auth.uid()
    )
    AND (
      professional_id IN (
        SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
          AND u.tenant_id = agenda_blocks.tenant_id
          AND u.role = 'admin'
      )
    )
  );
