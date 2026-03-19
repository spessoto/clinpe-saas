create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  next_attempt_at timestamptz default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_queue_status_check
    check (status in ('pending', 'processing', 'sent', 'failed'))
);

create index if not exists idx_email_queue_status_next_attempt
  on public.email_queue (status, next_attempt_at);

create index if not exists idx_email_queue_tenant_created_at
  on public.email_queue (tenant_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_email_queue_updated_at on public.email_queue;
create trigger set_email_queue_updated_at
  before update on public.email_queue
  for each row
  execute function public.set_updated_at();
