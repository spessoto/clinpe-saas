-- Epic 11.1: Fundacao do painel administrativo

alter table public.tenants
  add column if not exists is_permanent_free_plan boolean not null default false,
  add column if not exists trial_extension_days integer not null default 0,
  add column if not exists trial_last_extended_at timestamptz,
  add column if not exists trial_last_extended_by_email text,
  add column if not exists permanent_free_granted_at timestamptz,
  add column if not exists permanent_free_granted_by_email text;

create index if not exists idx_tenants_is_permanent_free_plan
  on public.tenants (is_permanent_free_plan);

comment on column public.tenants.is_permanent_free_plan is 'Libera acesso continuo ao tenant sem periodo de trial ou assinatura paga';
comment on column public.tenants.trial_extension_days is 'Quantidade acumulada de dias extras concedidos manualmente ao trial';
comment on column public.tenants.trial_last_extended_at is 'Data da ultima extensao manual de trial';
comment on column public.tenants.trial_last_extended_by_email is 'E-mail do admin que aplicou a ultima extensao manual de trial';
comment on column public.tenants.permanent_free_granted_at is 'Data em que o plano free permanente foi habilitado';
comment on column public.tenants.permanent_free_granted_by_email is 'E-mail do admin que habilitou o plano free permanente';

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references public.users (id) on delete set null,
  admin_user_email text not null,
  tenant_id uuid references public.tenants (id) on delete cascade,
  action text not null,
  previous_state jsonb not null default '{}'::jsonb,
  next_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_tenant_id
  on public.admin_audit_log (tenant_id, created_at desc);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create or replace function public.is_tenant_access_active(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when t.is_permanent_free_plan then true
      when now() <= (t.trial_ends_at + make_interval(days => greatest(t.trial_extension_days, 0))) then true
      when t.subscription_status = 'active'
        and (
          t.subscription_expires_at is null
          or now() <= t.subscription_expires_at
        ) then true
      else false
    end
  from public.tenants t
  where t.id = p_tenant_id;
$$;
