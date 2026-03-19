export type TenantBillingStatus = "trialing" | "active" | "past_due";

export type TenantAccessState = {
  trial_ends_at: string;
  trial_extension_days?: number | null;
  is_permanent_free_plan?: boolean | null;
  subscription_status: TenantBillingStatus;
  subscription_expires_at?: string | null;
};

export function getEffectiveTrialEnd(tenant: TenantAccessState) {
  const baseDate = new Date(tenant.trial_ends_at);
  if (Number.isNaN(baseDate.getTime())) {
    return new Date(0);
  }

  const effectiveEnd = new Date(baseDate);
  const extraDays = Math.max(0, tenant.trial_extension_days ?? 0);
  effectiveEnd.setDate(effectiveEnd.getDate() + extraDays);
  return effectiveEnd;
}

export function hasTenantAccess(tenant: TenantAccessState) {
  if (tenant.is_permanent_free_plan) {
    return true;
  }

  const now = Date.now();
  const inTrialWindow = getEffectiveTrialEnd(tenant).getTime() >= now;
  const hasActiveSubscription =
    tenant.subscription_status === "active" &&
    (!tenant.subscription_expires_at ||
      new Date(tenant.subscription_expires_at).getTime() >= now);

  return inTrialWindow || hasActiveSubscription;
}
