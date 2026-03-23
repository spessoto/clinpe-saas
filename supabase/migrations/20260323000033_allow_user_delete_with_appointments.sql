alter table public.appointments
  add column if not exists professional_name_snapshot text;

update public.appointments as a
set professional_name_snapshot = u.full_name
from public.users as u
where a.professional_id = u.id
  and (
    a.professional_name_snapshot is null
    or btrim(a.professional_name_snapshot) = ''
  );

alter table public.appointments
  alter column professional_id drop not null;

alter table public.appointments
  drop constraint if exists appointments_professional_id_fkey;

alter table public.appointments
  add constraint appointments_professional_id_fkey
  foreign key (professional_id)
  references public.users (id)
  on delete set null;