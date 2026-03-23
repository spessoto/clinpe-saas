alter table public.appointments
  drop column if exists google_event_id;

drop table if exists public.google_integrations cascade;