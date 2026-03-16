-- Professional settings for white-label booking flow

alter table public.users
  add column if not exists profile_photo_url text,
  add column if not exists working_days smallint[] not null default '{1,2,3,4,5}',
  add column if not exists working_start_time time not null default '09:00:00',
  add column if not exists working_end_time time not null default '17:00:00',
  add column if not exists appointment_duration_minutes integer not null default 60;

alter table public.users
  drop constraint if exists users_appointment_duration_minutes_check;

alter table public.users
  add constraint users_appointment_duration_minutes_check
  check (appointment_duration_minutes >= 15 and appointment_duration_minutes <= 240);
