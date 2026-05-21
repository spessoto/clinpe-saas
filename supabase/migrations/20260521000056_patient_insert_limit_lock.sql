-- Serialize patient inserts per tenant so the plan limit cannot be bypassed by concurrent requests.

create or replace function public.enforce_patient_limit_per_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  max_allowed integer;
begin
  if NEW.tenant_id is null then
    raise exception 'tenant_id é obrigatório.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text, 0));

  select max_patients_allowed
    into max_allowed
  from public.tenants
  where id = NEW.tenant_id;

  if max_allowed is null then
    raise exception 'Tenant não encontrado.';
  end if;

  select count(*)
    into current_count
  from public.patients
  where tenant_id = NEW.tenant_id;

  if current_count >= max_allowed then
    raise exception 'Limite de pacientes atingido para este tenant.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_patient_limit_before_insert on public.patients;
create trigger enforce_patient_limit_before_insert
  before insert on public.patients
  for each row
  execute function public.enforce_patient_limit_per_tenant();