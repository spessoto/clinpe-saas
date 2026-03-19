-- Epic: Ficha completa de cadastro do paciente (dados administrativos)
-- Adiciona campos de identificação legal, contato, localização e perfil social.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cpf              VARCHAR(14),
  ADD COLUMN IF NOT EXISTS rg               VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_street   TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_zipcode  VARCHAR(9),
  ADD COLUMN IF NOT EXISTS occupation       TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);

-- Índice para buscas por e-mail
CREATE INDEX IF NOT EXISTS patients_email_idx ON public.patients (email);

COMMENT ON COLUMN public.patients.cpf                    IS 'CPF do paciente — necessário para atestados e recibos';
COMMENT ON COLUMN public.patients.rg                     IS 'RG do paciente — necessário para termos de consentimento';
COMMENT ON COLUMN public.patients.email                  IS 'E-mail para envio de NF e campanhas';
COMMENT ON COLUMN public.patients.address_street         IS 'Logradouro e número';
COMMENT ON COLUMN public.patients.address_neighborhood   IS 'Bairro (indicador de raio de alcance da clínica)';
COMMENT ON COLUMN public.patients.address_zipcode        IS 'CEP no formato XXXXX-XXX';
COMMENT ON COLUMN public.patients.occupation             IS 'Profissão/ocupação — relevante na avaliação podológica';
COMMENT ON COLUMN public.patients.emergency_contact_name IS 'Nome do contato de emergência';
COMMENT ON COLUMN public.patients.emergency_contact_phone IS 'Telefone do contato de emergência';
