-- Coupon system: admin coupon catalog, redemption tracking, signup integration,
-- and recurring discount state tied to tenant billing.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null
    check (discount_value >= 0),
  discounted_cycles integer not null default 1
    check (discounted_cycles > 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  max_total_uses integer
    check (max_total_uses is null or max_total_uses > 0),
  times_redeemed integer not null default 0
    check (times_redeemed >= 0),
  applies_to_period text not null default 'both'
    check (applies_to_period in ('monthly', 'annual', 'both')),
  is_active boolean not null default true,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_normalized check (code = upper(btrim(code))),
  constraint coupons_validity_window check (valid_until >= valid_from),
  constraint coupons_percentage_range check (
    discount_type <> 'percentage' or discount_value <= 100
  )
);

create index if not exists idx_coupons_active_window
  on public.coupons (is_active, valid_from, valid_until);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  redeemed_by_email text not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'linked', 'active', 'completed', 'cancelled')),
  discounted_cycles_total integer not null check (discounted_cycles_total > 0),
  discounted_cycles_remaining integer not null check (discounted_cycles_remaining >= 0),
  billing_period text
    check (billing_period is null or billing_period in ('monthly', 'annual')),
  original_amount numeric(10,2),
  discounted_amount numeric(10,2),
  asaas_subscription_id text,
  linked_at timestamptz,
  last_billing_event_at timestamptz,
  last_processed_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupon_redemptions_unique_user unique (coupon_id, user_id),
  constraint coupon_redemptions_unique_email unique (coupon_id, redeemed_by_email)
);

create index if not exists idx_coupon_redemptions_tenant_status
  on public.coupon_redemptions (tenant_id, status);

create index if not exists idx_coupon_redemptions_subscription
  on public.coupon_redemptions (asaas_subscription_id);

alter table public.tenants
  add column if not exists signup_coupon_code text;

comment on table public.coupons is 'Catálogo de cupons de desconto administrados pelo painel admin';
comment on table public.coupon_redemptions is 'Vínculo entre cupom, usuário cadastrado e tenant para rastrear uso único e ciclos restantes';
comment on column public.tenants.signup_coupon_code is 'Cupom informado no cadastro inicial, usado para rastrear a origem promocional do tenant';

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coupons_touch_updated_at on public.coupons;
create trigger coupons_touch_updated_at
  before update on public.coupons
  for each row
  execute function public.touch_updated_at();

drop trigger if exists coupon_redemptions_touch_updated_at on public.coupon_redemptions;
create trigger coupon_redemptions_touch_updated_at
  before update on public.coupon_redemptions
  for each row
  execute function public.touch_updated_at();

create or replace function public.redeem_signup_coupon(
  p_coupon_code text,
  p_user_id uuid,
  p_email text,
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_normalized_code text;
begin
  v_normalized_code := upper(btrim(coalesce(p_coupon_code, '')));

  if v_normalized_code = '' then
    return;
  end if;

  select *
  into v_coupon
  from public.coupons
  where code = v_normalized_code
  for update;

  if not found then
    raise exception 'Cupom inválido.';
  end if;

  if not v_coupon.is_active then
    raise exception 'Cupom inativo.';
  end if;

  if now() < v_coupon.valid_from or now() > v_coupon.valid_until then
    raise exception 'Cupom fora do período de validade.';
  end if;

  if v_coupon.max_total_uses is not null and v_coupon.times_redeemed >= v_coupon.max_total_uses then
    raise exception 'Cupom esgotado.';
  end if;

  if exists (
    select 1
    from public.coupon_redemptions r
    where r.coupon_id = v_coupon.id
      and lower(r.redeemed_by_email) = lower(btrim(coalesce(p_email, '')))
  ) then
    raise exception 'Este cupom já foi utilizado por este usuário.';
  end if;

  insert into public.coupon_redemptions (
    coupon_id,
    tenant_id,
    user_id,
    redeemed_by_email,
    discounted_cycles_total,
    discounted_cycles_remaining,
    status
  )
  values (
    v_coupon.id,
    p_tenant_id,
    p_user_id,
    lower(btrim(coalesce(p_email, ''))),
    v_coupon.discounted_cycles,
    v_coupon.discounted_cycles,
    'reserved'
  );

  update public.coupons
  set times_redeemed = times_redeemed + 1,
      updated_at = now()
  where id = v_coupon.id;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  v_tenant_name text;
  v_full_name text;
  v_professional_register text;
  v_tenant_slug text;
  v_booking_slug text;
  v_coupon_code text;
begin
  new_tenant_id := gen_random_uuid();

  v_tenant_name := coalesce(
    new.raw_user_meta_data ->> 'clinic_name',
    new.raw_user_meta_data ->> 'tenant_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  v_professional_register := new.raw_user_meta_data ->> 'professional_register';
  v_coupon_code := upper(btrim(coalesce(new.raw_user_meta_data ->> 'coupon_code', '')));
  v_tenant_slug := public.generate_unique_tenant_slug(v_tenant_name);
  v_booking_slug := public.generate_unique_professional_slug(v_full_name, new.id);

  insert into public.tenants (
    id,
    name,
    slug,
    trial_ends_at,
    subscription_status,
    booking_page_title,
    booking_page_description,
    cpf_cnpj,
    signup_coupon_code
  )
  values (
    new_tenant_id,
    v_tenant_name,
    v_tenant_slug,
    now() + interval '7 days',
    'trialing',
    'Autoagendamento - ' || v_tenant_name,
    'Escolha um horario disponivel para sua consulta de podologia.',
    nullif(new.raw_user_meta_data ->> 'cpf_cnpj', ''),
    nullif(v_coupon_code, '')
  );

  insert into public.users (
    id,
    tenant_id,
    full_name,
    professional_register,
    booking_slug,
    email,
    role
  )
  values (
    new.id,
    new_tenant_id,
    v_full_name,
    v_professional_register,
    v_booking_slug,
    new.email,
    'owner'
  );

  if v_coupon_code <> '' then
    perform public.redeem_signup_coupon(v_coupon_code, new.id, new.email, new_tenant_id);
  end if;

  begin
    perform public.seed_default_pop_templates(new_tenant_id);
  exception when others then
    null;
  end;

  return new;
end;
$$;