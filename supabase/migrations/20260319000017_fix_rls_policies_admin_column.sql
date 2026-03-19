-- Fix RLS policies for is_admin column - remove broken policies from 20260319000016
-- These policies were checking is_admin of current user recursively, causing errors

-- Remove broken policies
drop policy if exists "users_is_admin_select_admin_only" on public.users;
drop policy if exists "users_is_admin_update_admin_only" on public.users;

-- Drop and recreate simpler RLS policy for SELECT (allow self-access)
-- The is_admin column will be protected at application level for now
-- This is safer than complex recursive policies that can break INSERT/UPDATE

-- Note: is_admin is already protected via requireAdminAccess() in code
-- and the toggle action only works for authenticated admins
-- So we just need basic RLS: each user can see their own record

-- Existing policies from migration 20260312000001 already handle this
-- No additional policies needed for is_admin column

-- Users can still be created via trigger because it's SECURITY DEFINER
