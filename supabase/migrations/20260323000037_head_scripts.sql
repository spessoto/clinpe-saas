-- head_scripts: stores custom scripts to be injected in <head> (managed by admin)
CREATE TABLE IF NOT EXISTS public.head_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.head_scripts ENABLE ROW LEVEL SECURITY;

-- Only service-role (admin) can read/write; public pages read active scripts via server component
CREATE POLICY "Service role has full access to head_scripts"
  ON public.head_scripts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
