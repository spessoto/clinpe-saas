-- =============================================================================
-- SECURITY HARDENING — Complemento ao migration 20260323000035
-- =============================================================================
-- Corrige lacunas de segurança identificadas na revisão do banco:
--   1. RLS ausente em asaas_webhook_payment_events (acesso só por service role)
--   2. updated_at e trigger em lgpd_requests (rastreabilidade de status)
--   3. Garante search_path = public em funções adicionadas após o hardening
--      anterior (mark_asaas_webhook_payment_processed, etc.)
--   4. Bloqueia acesso anon à tabela patient_access_log explicitamente
--   5. Bloqueia acesso anon (role "anon") a tabelas sensíveis de pacientes
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. RLS em asaas_webhook_payment_events
-- ---------------------------------------------------------------------------
-- Essa tabela é acessada apenas pelas funções security definer (que executam
-- como superusuário e ignoram RLS). Ativar RLS bloqueia qualquer acesso
-- direto de clientes autenticados ou anônimos.
-- ---------------------------------------------------------------------------
alter table public.asaas_webhook_payment_events enable row level security;

-- Sem políticas = deny-all para roles autenticadas e anon.
-- As funções claim/mark que usam security definer são isentas.

-- ---------------------------------------------------------------------------
-- 2. updated_at em lgpd_requests
-- ---------------------------------------------------------------------------
alter table public.lgpd_requests
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_lgpd_requests_updated_at on public.lgpd_requests;
create trigger set_lgpd_requests_updated_at
  before update on public.lgpd_requests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Confirma search_path nas funções adicionadas após o hardening anterior
-- ---------------------------------------------------------------------------
alter function public.claim_asaas_webhook_payment(text, text)
  set search_path = public;

alter function public.mark_asaas_webhook_payment_processed(text)
  set search_path = public;

alter function public.mark_asaas_webhook_payment_failed(text, text)
  set search_path = public;

alter function public.enforce_patient_limit_per_tenant()
  set search_path = public;

alter function public.anonymize_patient(uuid, uuid)
  set search_path = public;

alter function public.export_patient_data(uuid, uuid)
  set search_path = public;

-- ---------------------------------------------------------------------------
-- 4. Bloqueia role anon em tabelas sensíveis
-- ---------------------------------------------------------------------------
-- Revoga qualquer privilégio de SELECT da role anon nas tabelas de dados
-- de saúde. O PostgREST usa a role anon para rotas públicas — garantir que
-- ela não consiga ler dados clínicos mesmo que RLS seja mal configurada.
-- ---------------------------------------------------------------------------
-- Usa bloco DO para revogar apenas tabelas que existem (evita erro se alguma
-- feature ainda não foi deployada no ambiente alvo).
do $$
declare
  t text;
  tables text[] := array[
    'patients', 'medical_records', 'appointments', 'financial_transactions',
    'sterilization_logs', 'sterilization_biological_tests',
    'whatsapp_messages', 'whatsapp_contacts',
    'push_subscriptions', 'notifications',
    'lgpd_requests', 'patient_access_log',
    'commissions', 'email_queue', 'asaas_webhook_payment_events'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Comentários de conformidade nas tabelas de dados sensíveis
-- ---------------------------------------------------------------------------
comment on table public.patients is
  'Dados cadastrais e de saúde dos pacientes. Dado sensível — LGPD Art. 11. '
  'Retenção mínima: 240 meses (20 anos) por resolução CFM/CFFa. '
  'Somente usuários autenticados do mesmo tenant têm acesso (RLS ativo).';

comment on table public.medical_records is
  'Prontuários clínicos dos pacientes. Dado sensível de saúde — LGPD Art. 11. '
  'Vedada a exclusão antes do prazo legal de retenção.';

comment on table public.patient_access_log is
  'Log imutável de acesso a dados de pacientes — LGPD Art. 37. '
  'Registros NÃO devem ser removidos; USE append-only via políticas RLS.';

commit;
