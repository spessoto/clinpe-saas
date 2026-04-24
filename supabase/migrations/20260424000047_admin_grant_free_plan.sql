-- Migration: admin_grant_free_plan
-- Adds columns to tenants to track admin-granted free paid plans

alter table public.tenants
  add column if not exists free_plan_granted_at timestamptz,
  add column if not exists free_plan_granted_by_email text,
  add column if not exists free_plan_tier text;

comment on column public.tenants.free_plan_granted_at is 'Data em que um plano pago gratuito foi concedido por um admin';
comment on column public.tenants.free_plan_granted_by_email is 'E-mail do admin que concedeu o plano pago gratuito';
comment on column public.tenants.free_plan_tier is 'Tier do plano pago concedido gratuitamente (tier_1, tier_2, tier_3)';
