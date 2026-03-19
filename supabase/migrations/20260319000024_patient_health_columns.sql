-- Modelo Híbrido: colunas de saúde estruturadas no cadastro do paciente.
-- O cadastro guarda o estado atual (dado mestre para alertas visuais).
-- A anamnese da consulta mantém o snapshot declarado naquele atendimento.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS has_diabetes             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS diabetes_type            VARCHAR(2),
  ADD COLUMN IF NOT EXISTS diabetes_on_insulin      BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_vascular_issues      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_coagulation_disorders BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_oncological_history  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS continuous_meds          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS patient_allergies        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_smoker                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS predominant_footwear     VARCHAR(50);

-- Índice GIN para busca em continuous_meds e allergies
CREATE INDEX IF NOT EXISTS patients_continuous_meds_idx   ON public.patients USING GIN(continuous_meds);
CREATE INDEX IF NOT EXISTS patients_patient_allergies_idx ON public.patients USING GIN(patient_allergies);

COMMENT ON COLUMN public.patients.has_diabetes              IS 'Paciente é diabético (true/false)';
COMMENT ON COLUMN public.patients.diabetes_type             IS 'Tipo de diabetes: 1 ou 2';
COMMENT ON COLUMN public.patients.diabetes_on_insulin       IS 'Faz uso de insulina';
COMMENT ON COLUMN public.patients.has_vascular_issues       IS 'Possui alterações vasculares/cardíacas';
COMMENT ON COLUMN public.patients.has_coagulation_disorders IS 'Distúrbio de coagulação (hemofilia, etc.)';
COMMENT ON COLUMN public.patients.has_oncological_history   IS 'Histórico ou tratamento oncológico ativo';
COMMENT ON COLUMN public.patients.continuous_meds           IS 'Medicamentos de uso contínuo (AAS, corticoide, etc.)';
COMMENT ON COLUMN public.patients.patient_allergies         IS 'Alergias conhecidas (látex, iodo, etc.)';
COMMENT ON COLUMN public.patients.is_smoker                 IS 'Paciente é fumante';
COMMENT ON COLUMN public.patients.predominant_footwear      IS 'Tipo de calçado predominante';
