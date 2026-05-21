-- Idempotency guard for Asaas payment webhooks.

create table if not exists public.asaas_webhook_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asaas_webhook_payment_events_status_idx
  on public.asaas_webhook_payment_events (status, created_at desc);

drop trigger if exists set_asaas_webhook_payment_events_updated_at on public.asaas_webhook_payment_events;
create trigger set_asaas_webhook_payment_events_updated_at
  before update on public.asaas_webhook_payment_events
  for each row
  execute function public.set_updated_at();

create or replace function public.claim_asaas_webhook_payment(
  p_payment_id text,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_status text;
begin
  if p_payment_id is null or btrim(p_payment_id) = '' then
    return true;
  end if;

  begin
    insert into public.asaas_webhook_payment_events (payment_id, event_type, status)
    values (p_payment_id, p_event_type, 'processing');
    return true;
  exception
    when unique_violation then
      select status
        into existing_status
      from public.asaas_webhook_payment_events
      where payment_id = p_payment_id
      for update;

      if existing_status = 'failed' then
        update public.asaas_webhook_payment_events
        set event_type = p_event_type,
            status = 'processing',
            error_message = null,
            processed_at = null
        where payment_id = p_payment_id;

        return true;
      end if;

      return false;
  end;
end;
$$;

create or replace function public.mark_asaas_webhook_payment_processed(
  p_payment_id text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.asaas_webhook_payment_events
  set status = 'processed',
      error_message = null,
      processed_at = now()
  where payment_id = p_payment_id;
$$;

create or replace function public.mark_asaas_webhook_payment_failed(
  p_payment_id text,
  p_error_message text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.asaas_webhook_payment_events
  set status = 'failed',
      error_message = left(coalesce(p_error_message, 'Erro ao processar webhook'), 2000)
  where payment_id = p_payment_id;
$$;