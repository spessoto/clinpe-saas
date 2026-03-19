-- Performance indexes for hot query paths (agenda, booking and admin users)

create index if not exists idx_appointments_tenant_professional_scheduled
  on public.appointments (tenant_id, professional_id, scheduled_at desc);

create index if not exists idx_appointments_professional_scheduled
  on public.appointments (professional_id, scheduled_at desc);

create index if not exists idx_appointments_active_schedule
  on public.appointments (scheduled_at desc)
  where status <> 'canceled';

create index if not exists idx_google_integrations_tenant_user
  on public.google_integrations (tenant_id, user_id);

create index if not exists idx_patients_tenant_created_at
  on public.patients (tenant_id, created_at desc);
