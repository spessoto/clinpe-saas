-- Epic 3: Prontuario + Anamnese + Storage
-- Bucket medical-images and storage RLS by tenant folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-images',
  'medical-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists medical_records_tenant_patient_idx
  on public.medical_records (tenant_id, patient_id, created_at desc);

create index if not exists medical_records_anamnesis_gin_idx
  on public.medical_records using gin (anamnesis_data);

-- Storage policies: folder prefix must match tenant_id.
drop policy if exists "medical_images_select_same_tenant" on storage.objects;
create policy "medical_images_select_same_tenant"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'medical-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_images_insert_same_tenant" on storage.objects;
create policy "medical_images_insert_same_tenant"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'medical-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_images_update_same_tenant" on storage.objects;
create policy "medical_images_update_same_tenant"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'medical-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  )
  with check (
    bucket_id = 'medical-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_images_delete_same_tenant" on storage.objects;
create policy "medical_images_delete_same_tenant"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'medical-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );
