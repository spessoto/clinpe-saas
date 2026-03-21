"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import {
  type CouponAppliesToPeriod,
  type CouponDiscountType,
  type CouponRedemptionRow,
  type CouponRow,
  normalizeCouponCode,
} from "@/lib/coupons";
import { createAdminClient } from "@/lib/supabase/admin";

type CouponUsageRow = Omit<CouponRedemptionRow, "coupon"> & {
  coupon?: Pick<CouponRow, "code"> | null;
  tenant?: { name: string } | null;
  user?: { full_name: string } | null;
};

type RawCouponUsageRow = Omit<CouponRedemptionRow, "coupon"> & {
  coupon?: Array<Pick<CouponRow, "code">> | Pick<CouponRow, "code"> | null;
  tenant?: Array<{ name: string }> | { name: string } | null;
  user?: Array<{ full_name: string }> | { full_name: string } | null;
};

function normalizeSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeCouponUsageRows(rows: RawCouponUsageRow[]): CouponUsageRow[] {
  return rows.map((row) => ({
    ...row,
    coupon: normalizeSingleRelation(row.coupon),
    tenant: normalizeSingleRelation(row.tenant),
    user: normalizeSingleRelation(row.user),
  }));
}

function parseCouponType(formData: FormData): CouponDiscountType {
  const value = String(formData.get("discount_type") ?? "").trim();

  if (value !== "percentage" && value !== "fixed") {
    redirect("/admin/coupons?error=Tipo%20de%20cupom%20inválido");
  }

  return value;
}

function parseAppliesToPeriod(formData: FormData): CouponAppliesToPeriod {
  const value = String(formData.get("applies_to_period") ?? "").trim();

  if (!["monthly", "annual", "both"].includes(value)) {
    redirect("/admin/coupons?error=Escopo%20de%20período%20inválido");
  }

  return value as CouponAppliesToPeriod;
}

function parseNumber(
  formData: FormData,
  key: string,
  min: number,
  errorPrefix: string,
) {
  const raw = String(formData.get(key) ?? "")
    .trim()
    .replace(",", ".");
  const value = Number(raw);

  if (!Number.isFinite(value) || value < min) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent(`${errorPrefix} inválido`)}`,
    );
  }

  return Math.round(value * 100) / 100;
}

function parseOptionalPositiveInteger(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    return null;
  }

  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value <= 0) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent(`Valor inválido para ${key}`)}`,
    );
  }

  return value;
}

function parseDateTime(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = new Date(raw);

  if (!raw || Number.isNaN(value.getTime())) {
    redirect(`/admin/coupons?error=${encodeURIComponent(`${label} inválida`)}`);
  }

  return value.toISOString();
}

function ensureCouponWindow(validFrom: string, validUntil: string) {
  if (new Date(validUntil).getTime() < new Date(validFrom).getTime()) {
    redirect(
      "/admin/coupons?error=Validade%20final%20deve%20ser%20maior%20que%20a%20inicial",
    );
  }
}

function ensureDiscountRange(type: CouponDiscountType, value: number) {
  if (type === "percentage" && value > 100) {
    redirect(
      "/admin/coupons?error=Desconto%20percentual%20não%20pode%20ultrapassar%20100%25",
    );
  }
}

export async function getAdminCouponsData() {
  await requireAdminAccess();

  const adminClient = createAdminClient();
  const [couponsResult, redemptionsResult] = await Promise.all([
    adminClient
      .from("coupons")
      .select(
        "id, code, description, discount_type, discount_value, discounted_cycles, valid_from, valid_until, max_total_uses, times_redeemed, applies_to_period, is_active, updated_by_email, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    adminClient
      .from("coupon_redemptions")
      .select(
        "id, coupon_id, tenant_id, user_id, redeemed_by_email, status, discounted_cycles_total, discounted_cycles_remaining, billing_period, original_amount, discounted_amount, asaas_subscription_id, linked_at, last_billing_event_at, last_processed_payment_id, created_at, updated_at, coupon:coupons(code), tenant:tenants(name), user:users(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    coupons: (couponsResult.data ?? []) as CouponRow[],
    redemptions: normalizeCouponUsageRows(
      (redemptionsResult.data ?? []) as RawCouponUsageRow[],
    ),
  };
}

export async function createCouponAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const discountType = parseCouponType(formData);
  const discountValue = parseNumber(
    formData,
    "discount_value",
    0,
    "Valor do desconto",
  );
  const discountedCycles = Math.round(
    parseNumber(formData, "discounted_cycles", 1, "Número de ciclos"),
  );
  const validFrom = parseDateTime(formData, "valid_from", "Data inicial");
  const validUntil = parseDateTime(formData, "valid_until", "Data final");
  const maxTotalUses = parseOptionalPositiveInteger(formData, "max_total_uses");
  const appliesToPeriod = parseAppliesToPeriod(formData);
  const isActive = String(formData.get("is_active") ?? "") === "on";

  if (!code) {
    redirect("/admin/coupons?error=Código%20do%20cupom%20é%20obrigatório");
  }

  ensureCouponWindow(validFrom, validUntil);
  ensureDiscountRange(discountType, discountValue);

  const { error } = await adminClient.from("coupons").insert({
    code,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    discounted_cycles: discountedCycles,
    valid_from: validFrom,
    valid_until: validUntil,
    max_total_uses: maxTotalUses,
    applies_to_period: appliesToPeriod,
    is_active: isActive,
    updated_by_email: adminUser.email,
  });

  if (error) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent(`Falha ao criar cupom: ${error.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: null,
    action: "create_coupon",
    previous_state: null,
    next_state: {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      discounted_cycles: discountedCycles,
      valid_from: validFrom,
      valid_until: validUntil,
      max_total_uses: maxTotalUses,
      applies_to_period: appliesToPeriod,
      is_active: isActive,
    },
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?success=Cupom%20criado%20com%20sucesso");
}

export async function updateCouponAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const couponId = String(formData.get("coupon_id") ?? "").trim();
  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const discountType = parseCouponType(formData);
  const discountValue = parseNumber(
    formData,
    "discount_value",
    0,
    "Valor do desconto",
  );
  const discountedCycles = Math.round(
    parseNumber(formData, "discounted_cycles", 1, "Número de ciclos"),
  );
  const validFrom = parseDateTime(formData, "valid_from", "Data inicial");
  const validUntil = parseDateTime(formData, "valid_until", "Data final");
  const maxTotalUses = parseOptionalPositiveInteger(formData, "max_total_uses");
  const appliesToPeriod = parseAppliesToPeriod(formData);
  const isActive = String(formData.get("is_active") ?? "") === "on";

  if (!couponId || !code) {
    redirect("/admin/coupons?error=Cupom%20inválido");
  }

  ensureCouponWindow(validFrom, validUntil);
  ensureDiscountRange(discountType, discountValue);

  const { data: currentCoupon, error: currentCouponError } = await adminClient
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, discounted_cycles, valid_from, valid_until, max_total_uses, applies_to_period, is_active",
    )
    .eq("id", couponId)
    .single();

  if (currentCouponError || !currentCoupon) {
    redirect("/admin/coupons?error=Cupom%20não%20encontrado");
  }

  const nextState = {
    code,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    discounted_cycles: discountedCycles,
    valid_from: validFrom,
    valid_until: validUntil,
    max_total_uses: maxTotalUses,
    applies_to_period: appliesToPeriod,
    is_active: isActive,
    updated_by_email: adminUser.email,
  };

  const { error } = await adminClient
    .from("coupons")
    .update(nextState)
    .eq("id", couponId);

  if (error) {
    redirect(
      `/admin/coupons?error=${encodeURIComponent(`Falha ao atualizar cupom: ${error.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: null,
    action: "update_coupon",
    previous_state: currentCoupon,
    next_state: nextState,
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?success=Cupom%20atualizado%20com%20sucesso");
}
