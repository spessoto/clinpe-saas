-- Epic 6.1: Transicao para Asaas + bloqueio rigido por assinatura vencida

-- 1) Billing gateway transition fields (sem remover legado MP por agora)
alter table public.tenants
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists subscription_expires_at timestamptz;

create index if not exists idx_tenants_asaas_customer_id on public.tenants (asaas_customer_id);
create index if not exists idx_tenants_asaas_subscription_id on public.tenants (asaas_subscription_id);
create index if not exists idx_tenants_subscription_expires_at on public.tenants (subscription_expires_at);

comment on column public.tenants.asaas_customer_id is 'ID do cliente no Asaas';
comment on column public.tenants.asaas_subscription_id is 'ID da assinatura recorrente no Asaas';
comment on column public.tenants.subscription_expires_at is 'Data limite da assinatura ativa para bloqueio de acesso';

create or replace function public.is_tenant_access_active(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (now() <= t.trial_ends_at)
    or (
      t.subscription_status = 'active'
      and (
        t.subscription_expires_at is null
        or now() <= t.subscription_expires_at
      )
    )
  from public.tenants t
  where t.id = p_tenant_id;
$$;

-- 2) Hard lock via RLS (areas internas)
-- Patients
alter policy "patients_select_same_tenant"
  on public.patients
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "patients_insert_same_tenant"
  on public.patients
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "patients_update_same_tenant"
  on public.patients
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "patients_delete_same_tenant"
  on public.patients
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

-- Appointments
alter policy "appointments_select_same_tenant"
  on public.appointments
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "appointments_insert_same_tenant"
  on public.appointments
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "appointments_update_same_tenant"
  on public.appointments
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "appointments_delete_same_tenant"
  on public.appointments
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

-- Medical records
alter policy "records_select_same_tenant"
  on public.medical_records
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "records_insert_same_tenant"
  on public.medical_records
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "records_update_same_tenant"
  on public.medical_records
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "records_delete_same_tenant"
  on public.medical_records
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

-- Materials
alter policy "materials_select_same_tenant"
  on public.materials
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "materials_insert_same_tenant"
  on public.materials
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "materials_update_same_tenant"
  on public.materials
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

alter policy "materials_delete_same_tenant"
  on public.materials
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_access_active(tenant_id)
  );

-- 3) Hard lock for booking/integrations content tables
do $$
begin
  if to_regclass('public.google_integrations') is not null then
    execute $sql$
      alter policy "google_integrations_select_same_tenant"
        on public.google_integrations
        using (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "google_integrations_insert_same_tenant"
        on public.google_integrations
        with check (
          tenant_id = public.current_user_tenant_id()
          and user_id = auth.uid()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "google_integrations_update_same_tenant"
        on public.google_integrations
        using (
          tenant_id = public.current_user_tenant_id()
          and user_id = auth.uid()
          and public.is_tenant_access_active(tenant_id)
        )
        with check (
          tenant_id = public.current_user_tenant_id()
          and user_id = auth.uid()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "google_integrations_delete_same_tenant"
        on public.google_integrations
        using (
          tenant_id = public.current_user_tenant_id()
          and user_id = auth.uid()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;
  end if;

  if to_regclass('public.pop_documents') is not null then
    execute $sql$
      alter policy "pop_documents_select_same_tenant"
        on public.pop_documents
        using (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "pop_documents_insert_same_tenant"
        on public.pop_documents
        with check (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "pop_documents_update_same_tenant"
        on public.pop_documents
        using (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
        with check (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;

    execute $sql$
      alter policy "pop_documents_delete_same_tenant"
        on public.pop_documents
        using (
          tenant_id = public.current_user_tenant_id()
          and public.is_tenant_access_active(tenant_id)
        )
    $sql$;
  end if;
end
$$;

-- 4) Hard lock on storage bucket medical-images
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'medical_images_select_same_tenant'
  ) then
    execute $sql$
      alter policy "medical_images_select_same_tenant"
        on storage.objects
        using (
          bucket_id = 'medical-images'
          and split_part(name, '/', 1) = public.current_user_tenant_id()::text
          and public.is_tenant_access_active(public.current_user_tenant_id())
        )
    $sql$;

    execute $sql$
      alter policy "medical_images_insert_same_tenant"
        on storage.objects
        with check (
          bucket_id = 'medical-images'
          and split_part(name, '/', 1) = public.current_user_tenant_id()::text
          and public.is_tenant_access_active(public.current_user_tenant_id())
        )
    $sql$;

    execute $sql$
      alter policy "medical_images_update_same_tenant"
        on storage.objects
        using (
          bucket_id = 'medical-images'
          and split_part(name, '/', 1) = public.current_user_tenant_id()::text
          and public.is_tenant_access_active(public.current_user_tenant_id())
        )
        with check (
          bucket_id = 'medical-images'
          and split_part(name, '/', 1) = public.current_user_tenant_id()::text
          and public.is_tenant_access_active(public.current_user_tenant_id())
        )
    $sql$;

    execute $sql$
      alter policy "medical_images_delete_same_tenant"
        on storage.objects
        using (
          bucket_id = 'medical-images'
          and split_part(name, '/', 1) = public.current_user_tenant_id()::text
          and public.is_tenant_access_active(public.current_user_tenant_id())
        )
    $sql$;
  end if;
end
$$;
