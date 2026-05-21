-- Private bucket for clinical images attached to medical records.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-record-images',
  'medical-record-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "medical_record_images_select_same_tenant" on storage.objects;
create policy "medical_record_images_select_same_tenant"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'medical-record-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_record_images_insert_same_tenant" on storage.objects;
create policy "medical_record_images_insert_same_tenant"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'medical-record-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_record_images_update_same_tenant" on storage.objects;
create policy "medical_record_images_update_same_tenant"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'medical-record-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  )
  with check (
    bucket_id = 'medical-record-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

drop policy if exists "medical_record_images_delete_same_tenant" on storage.objects;
create policy "medical_record_images_delete_same_tenant"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'medical-record-images'
    and split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );