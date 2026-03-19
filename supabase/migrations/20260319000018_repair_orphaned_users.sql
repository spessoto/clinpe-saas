-- Repair: Create missing user profiles for orphaned auth.users
-- This handles cases where user was created in auth.users but trigger failed

do $$ 
declare
  v_orphan_record record;
  v_tenant_id uuid;
begin
  -- Find all auth users that don't have a public.users record
  for v_orphan_record in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.users pu on pu.id = au.id
    where pu.id is null
  loop
    -- Create a default tenant for this orphaned user
    v_tenant_id := gen_random_uuid();
    
    insert into public.tenants (
      id,
      name,
      slug,
      trial_ends_at,
      subscription_status
    )
    values (
      v_tenant_id,
      coalesce(
        v_orphan_record.raw_user_meta_data ->> 'clinic_name',
        split_part(v_orphan_record.email, '@', 1)
      ),
      public.generate_unique_tenant_slug(
        coalesce(
          v_orphan_record.raw_user_meta_data ->> 'clinic_name',
          split_part(v_orphan_record.email, '@', 1)
        )
      ),
      now() + interval '7 days',
      'trialing'
    ) on conflict do nothing;

    -- Create the user profile
    insert into public.users (
      id,
      tenant_id,
      full_name,
      email,
      role,
      is_admin
    )
    values (
      v_orphan_record.id,
      v_tenant_id,
      coalesce(
        v_orphan_record.raw_user_meta_data ->> 'full_name',
        split_part(v_orphan_record.email, '@', 1)
      ),
      v_orphan_record.email,
      'owner',
      case 
        when v_orphan_record.email = 'master@pododesk.com.br' then true
        else false
      end
    ) on conflict do nothing;

  end loop;

  raise notice 'Repair completed: orphaned user profiles have been created';
end $$;
