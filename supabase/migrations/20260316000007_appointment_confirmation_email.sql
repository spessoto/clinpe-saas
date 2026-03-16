do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'booking_confirmation_status'
      and n.nspname = 'public'
  ) then
    create type public.booking_confirmation_status as enum ('pending', 'confirmed', 'rejected');
  end if;
end
$$;

alter table public.appointments
  add column if not exists confirmation_status public.booking_confirmation_status,
  add column if not exists google_event_id text;

update public.appointments
set confirmation_status = case
  when status = 'canceled' then 'rejected'::public.booking_confirmation_status
  else 'confirmed'::public.booking_confirmation_status
end
where confirmation_status is null;

alter table public.appointments
  alter column confirmation_status set default 'pending';

alter table public.appointments
  alter column confirmation_status set not null;

create index if not exists appointments_confirmation_status_idx
  on public.appointments (confirmation_status);

create index if not exists appointments_google_event_id_idx
  on public.appointments (google_event_id);