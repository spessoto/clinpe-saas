ALTER TABLE public.head_scripts
  ADD COLUMN IF NOT EXISTS consent_category text NOT NULL DEFAULT 'essential';

ALTER TABLE public.head_scripts
  DROP CONSTRAINT IF EXISTS head_scripts_consent_category_check;

ALTER TABLE public.head_scripts
  ADD CONSTRAINT head_scripts_consent_category_check
  CHECK (consent_category IN ('essential', 'functional', 'analytics'));
