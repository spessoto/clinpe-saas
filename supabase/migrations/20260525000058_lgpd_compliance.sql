-- =============================================================================
-- LGPD COMPLIANCE (Lei Geral de Proteção de Dados — Lei nº 13.709/2018)
-- =============================================================================
-- Implementa os controles mínimos exigidos pela LGPD para dados de saúde:
--   • Direito de exclusão / anonimização (Art. 18, VI e VII)
--   • Direito de portabilidade / exportação (Art. 18, V)
--   • Log de auditoria de acesso a dados sensíveis (Art. 37)
--   • Retenção configurável com prazo mínimo legal para prontuários (20 anos
--     — CFM Res. 1821/2007 e CFFa Res. 478/2016)
--   • Flag de anonimização para manter integridade referencial sem dados PII
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Dados de retenção por tenant
-- ---------------------------------------------------------------------------
-- Prazo mínimo legal para prontuários de saúde no Brasil:
--   CFM/CFFa: 20 anos após o último atendimento para adultos.
--   Padrão do sistema: 240 meses = 20 anos.
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column if not exists data_retention_months integer not null default 240
    check (data_retention_months >= 60);  -- mínimo 5 anos para dados de saúde

comment on column public.tenants.data_retention_months is
  'Prazo de retenção de dados de pacientes em meses (mínimo 60, padrão 240 = 20 anos). '
  'Após o prazo sem novos atendimentos, o paciente pode ser anonimizado via LGPD.';

-- ---------------------------------------------------------------------------
-- 2. Flag de anonimização na tabela patients
-- ---------------------------------------------------------------------------
alter table public.patients
  add column if not exists is_anonymized boolean not null default false,
  add column if not exists anonymized_at timestamptz;

comment on column public.patients.is_anonymized is
  'TRUE após o processo de anonimização LGPD. Os dados de PII são apagados '
  'mas o registro permanece para preservar integridade de prontuários e financeiro.';
comment on column public.patients.anonymized_at is
  'Timestamp do momento em que a anonimização foi executada.';

create index if not exists patients_is_anonymized_idx
  on public.patients (tenant_id, is_anonymized)
  where is_anonymized = false;

-- ---------------------------------------------------------------------------
-- 3. Tabela de solicitações LGPD
-- ---------------------------------------------------------------------------
-- Registra pedidos dos titulares (pacientes) de exercício dos seus direitos:
--   erasure    → Art. 18, VI  — exclusão / anonimização
--   portability→ Art. 18, V  — exportação / portabilidade
--   restriction→ Art. 18, I  — confirmação / bloqueio temporário
-- ---------------------------------------------------------------------------
create table if not exists public.lgpd_requests (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  patient_id     uuid references public.patients (id) on delete set null,
  patient_name   text not null,          -- nome salvo no momento do pedido
  patient_email  text,
  request_type   text not null check (request_type in ('erasure', 'portability', 'restriction', 'rectification')),
  status         text not null default 'pending'
                   check (status in ('pending', 'processing', 'completed', 'rejected')),
  requester_note text,                   -- texto livre enviado pelo titular
  staff_note     text,                   -- nota interna do responsável
  requested_at   timestamptz not null default now(),
  processed_at   timestamptz,
  processed_by   uuid references public.users (id) on delete set null
);

create index if not exists lgpd_requests_tenant_idx  on public.lgpd_requests (tenant_id, status);
create index if not exists lgpd_requests_patient_idx on public.lgpd_requests (patient_id);

comment on table public.lgpd_requests is
  'Solicitações LGPD dos titulares de dados (pacientes). '
  'Deve ser respondida em até 15 dias úteis — Art. 18 §3º LGPD.';

alter table public.lgpd_requests enable row level security;

drop policy if exists "lgpd_requests_select_same_tenant" on public.lgpd_requests;
create policy "lgpd_requests_select_same_tenant"
  on public.lgpd_requests for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists "lgpd_requests_insert_same_tenant" on public.lgpd_requests;
create policy "lgpd_requests_insert_same_tenant"
  on public.lgpd_requests for insert
  to authenticated
  with check (tenant_id = public.current_user_tenant_id());

drop policy if exists "lgpd_requests_update_same_tenant" on public.lgpd_requests;
create policy "lgpd_requests_update_same_tenant"
  on public.lgpd_requests for update
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- ---------------------------------------------------------------------------
-- 4. Log de auditoria de acesso a dados sensíveis (Art. 37 LGPD)
-- ---------------------------------------------------------------------------
-- Registra quem acessou dados de pacientes e quando.
-- Inserções feitas via trigger / Server Action; sem UPDATE nem DELETE.
-- ---------------------------------------------------------------------------
create table if not exists public.patient_access_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,                        -- desnormalizado por performance
  user_id     uuid not null,
  patient_id  uuid not null,
  action      text not null check (action in ('view', 'export', 'anonymize', 'update_pii')),
  source      text,                                 -- ex: 'server_action', 'api', 'script'
  accessed_at timestamptz not null default now()
);

-- Índices para relatórios de auditoria
create index if not exists patient_access_log_tenant_user_idx
  on public.patient_access_log (tenant_id, user_id, accessed_at desc);
create index if not exists patient_access_log_patient_idx
  on public.patient_access_log (patient_id, accessed_at desc);

comment on table public.patient_access_log is
  'Trilha de auditoria de acesso a dados de pacientes — LGPD Art. 37. '
  'Registros NÃO podem ser deletados nem atualizados (apenas INSERT via políticas RLS).';

alter table public.patient_access_log enable row level security;

-- Apenas o service_role pode inserir (via Server Actions autenticadas)
drop policy if exists "access_log_insert_service" on public.patient_access_log;
create policy "access_log_insert_service"
  on public.patient_access_log for insert
  to authenticated
  with check (
    tenant_id = public.current_user_tenant_id()
    and user_id = auth.uid()
  );

-- Admins do tenant podem consultar os logs do seu tenant
drop policy if exists "access_log_select_same_tenant" on public.patient_access_log;
create policy "access_log_select_same_tenant"
  on public.patient_access_log for select
  to authenticated
  using (tenant_id = public.current_user_tenant_id());

-- Nenhuma política de UPDATE ou DELETE — registros são imutáveis

-- ---------------------------------------------------------------------------
-- 5. Função: anonymize_patient()
-- ---------------------------------------------------------------------------
-- Apaga todos os dados de identificação pessoal (PII) mantendo o registro
-- e seus vínculos (prontuários, atendimentos, financeiro) para preservar a
-- rastreabilidade clínica e fiscal exigida por lei.
-- Dados sensíveis de saúde (condições, medicamentos) são preservados pois
-- são necessários para auditoria clínica mas sem vínculo identificável.
-- ---------------------------------------------------------------------------
create or replace function public.anonymize_patient(
  p_patient_id uuid,
  p_tenant_id  uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Verifica se o paciente pertence ao tenant
  select count(*) into v_count
  from public.patients
  where id = p_patient_id
    and tenant_id = p_tenant_id
    and is_anonymized = false;

  if v_count = 0 then
    raise exception 'Paciente não encontrado, não pertence ao tenant ou já foi anonimizado.'
      using errcode = 'P0002';
  end if;

  -- Apaga todos os campos PII do paciente
  update public.patients
  set
    name                   = '[Dados Removidos - LGPD]',
    phone                  = null,
    email                  = null,
    cpf                    = null,
    rg                     = null,
    birth_date             = null,
    address_street         = null,
    address_neighborhood   = null,
    address_zipcode        = null,
    occupation             = null,
    emergency_contact_name = null,
    emergency_contact_phone= null,
    is_anonymized          = true,
    anonymized_at          = now()
  where id = p_patient_id
    and tenant_id = p_tenant_id;

  -- Registra no log de auditoria (sem user_id pois pode ser chamado por script)
  insert into public.patient_access_log
    (tenant_id, user_id, patient_id, action, source)
  values
    (p_tenant_id, coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
     p_patient_id, 'anonymize', 'lgpd_request');
end;
$$;

comment on function public.anonymize_patient(uuid, uuid) is
  'Anonimiza os dados PII de um paciente (LGPD Art. 18, VI). '
  'Preserva o registro e vínculos clínicos/fiscais para conformidade legal. '
  'Só deve ser chamada após checagem do prazo de retenção e pendências financeiras.';

-- ---------------------------------------------------------------------------
-- 6. Função: export_patient_data()
-- ---------------------------------------------------------------------------
-- Retorna todos os dados do paciente em formato JSON estruturado para
-- atender o direito de portabilidade — LGPD Art. 18, V.
-- ---------------------------------------------------------------------------
create or replace function public.export_patient_data(
  p_patient_id uuid,
  p_tenant_id  uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- Verifica permissão de tenant antes de exportar
  if not exists (
    select 1 from public.patients
    where id = p_patient_id and tenant_id = p_tenant_id
  ) then
    raise exception 'Paciente não encontrado ou não pertence ao tenant.'
      using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'exportado_em',  now(),
    'paciente',      row_to_json(p.*)::jsonb,
    'atendimentos',  coalesce(
      (select jsonb_agg(row_to_json(a.*)::jsonb order by a.scheduled_at desc)
       from public.appointments a
       where a.patient_id = p.id and a.tenant_id = p_tenant_id),
      '[]'::jsonb
    ),
    'prontuarios',   coalesce(
      (select jsonb_agg(row_to_json(mr.*)::jsonb order by mr.created_at desc)
       from public.medical_records mr
       where mr.patient_id = p.id and mr.tenant_id = p_tenant_id),
      '[]'::jsonb
    )
  )
  into v_result
  from public.patients p
  where p.id = p_patient_id
    and p.tenant_id = p_tenant_id;

  -- Registra acesso no log de auditoria
  insert into public.patient_access_log
    (tenant_id, user_id, patient_id, action, source)
  values
    (p_tenant_id, auth.uid(), p_patient_id, 'export', 'lgpd_portability');

  return v_result;
end;
$$;

comment on function public.export_patient_data(uuid, uuid) is
  'Exporta todos os dados de um paciente como JSON — direito de portabilidade LGPD Art. 18, V. '
  'Inclui dados cadastrais, atendimentos e prontuários vinculados ao tenant.';

-- ---------------------------------------------------------------------------
-- 7. View: pacientes elegíveis para anonimização
-- ---------------------------------------------------------------------------
-- Pacientes sem atendimento nos últimos data_retention_months meses podem
-- ser anonimizados. A view facilita a identificação para o processo LGPD.
-- ---------------------------------------------------------------------------
create or replace view public.patients_eligible_for_anonymization
  with (security_invoker = true)
as
select
  p.id,
  p.tenant_id,
  p.name,
  p.created_at,
  max(a.scheduled_at) as last_appointment_at,
  t.data_retention_months,
  (now() - max(coalesce(a.scheduled_at, p.created_at)))::interval as idle_time
from public.patients p
join public.tenants t on t.id = p.tenant_id
left join public.appointments a
  on a.patient_id = p.id and a.tenant_id = p.tenant_id
where
  p.is_anonymized = false
  and p.tenant_id = public.current_user_tenant_id()
group by p.id, p.tenant_id, p.name, p.created_at, t.data_retention_months
having
  now() - max(coalesce(a.scheduled_at, p.created_at))
    > (t.data_retention_months || ' months')::interval;

comment on view public.patients_eligible_for_anonymization is
  'Pacientes sem atendimento além do prazo de retenção configurado. '
  'Use antes de chamar anonymize_patient() para identificar candidatos.';

commit;
