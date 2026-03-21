export type CouponDiscountType = "percentage" | "fixed";

export type CouponAppliesToPeriod = "monthly" | "annual" | "both";

export type CouponStatus =
  | "reserved"
  | "linked"
  | "active"
  | "completed"
  | "cancelled";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  discounted_cycles: number;
  valid_from: string;
  valid_until: string;
  max_total_uses: number | null;
  times_redeemed: number;
  applies_to_period: CouponAppliesToPeriod;
  is_active: boolean;
  updated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type CouponRedemptionRow = {
  id: string;
  coupon_id: string;
  tenant_id: string;
  user_id: string;
  redeemed_by_email: string;
  status: CouponStatus;
  discounted_cycles_total: number;
  discounted_cycles_remaining: number;
  billing_period: "monthly" | "annual" | null;
  original_amount: number | null;
  discounted_amount: number | null;
  asaas_subscription_id: string | null;
  linked_at: string | null;
  last_billing_event_at: string | null;
  last_processed_payment_id: string | null;
  created_at: string;
  updated_at: string;
  coupon?: CouponRow | null;
};

export function normalizeCouponCode(input: string | null | undefined) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isCouponActiveNow(
  coupon: Pick<CouponRow, "is_active" | "valid_from" | "valid_until">,
) {
  if (!coupon.is_active) {
    return false;
  }

  const now = Date.now();
  const validFrom = new Date(coupon.valid_from).getTime();
  const validUntil = new Date(coupon.valid_until).getTime();

  if (Number.isNaN(validFrom) || Number.isNaN(validUntil)) {
    return false;
  }

  return validFrom <= now && validUntil >= now;
}

export function couponSupportsPeriod(
  coupon: Pick<CouponRow, "applies_to_period">,
  period: "monthly" | "annual",
) {
  return (
    coupon.applies_to_period === "both" || coupon.applies_to_period === period
  );
}

export function applyCouponDiscount(
  amount: number,
  coupon: Pick<CouponRow, "discount_type" | "discount_value">,
) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const discountValue = Math.max(0, Number(coupon.discount_value) || 0);

  if (coupon.discount_type === "percentage") {
    const discounted = safeAmount - safeAmount * (discountValue / 100);
    return Math.max(0, Math.round(discounted * 100) / 100);
  }

  return Math.max(0, Math.round((safeAmount - discountValue) * 100) / 100);
}

export function formatCouponValue(
  coupon: Pick<CouponRow, "discount_type" | "discount_value">,
) {
  if (coupon.discount_type === "percentage") {
    return `${coupon.discount_value}%`;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(coupon.discount_value);
}
