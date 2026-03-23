create or replace function public.prevent_reassign_deleted_professional_appointments()
returns trigger
language plpgsql
as $$
begin
  if old.professional_id is null
    and new.professional_id is not null
    and coalesce(btrim(old.professional_name_snapshot), '') <> '' then
    raise exception 'Appointments from deleted professionals cannot be reassigned.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_reassign_deleted_professional_appointments on public.appointments;

create trigger trg_prevent_reassign_deleted_professional_appointments
  before update of professional_id on public.appointments
  for each row
  execute function public.prevent_reassign_deleted_professional_appointments();