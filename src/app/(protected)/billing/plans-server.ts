import { createAdminClient } from "@/lib/supabase/admin";

import {
  BILLING_PLANS,
  type BillingPeriod,
  type BillingPlanConfig,
  type BillingTier,
} from "./plans";

type BillingPlanPriceRow = {
  tier: BillingTier;
  label: string;
  max_patients: number;
  monthly_amount: number;
  annual_amount: number;
  overage_slot_amount: number | null;
};

function makePlanDescription(
  label: string,
  maxPatients: number,
  period: BillingPeriod,
) {
  const periodLabel = period === "annual" ? "anual" : "mensal";
  return `PodoDesk ${label} – até ${maxPatients} pacientes (${periodLabel})`;
}

function withFallback(
  rows: BillingPlanPriceRow[] | null | undefined,
): BillingPlanConfig {
  if (!rows || rows.length === 0) {
    return BILLING_PLANS;
  }

  const resolved: BillingPlanConfig = structuredClone(BILLING_PLANS);

  for (const row of rows) {
    resolved[row.tier] = {
      label: row.label,
      maxPatients: row.max_patients,
      monthly: {
        amount: Number(row.monthly_amount),
        description: makePlanDescription(
          row.label,
          row.max_patients,
          "monthly",
        ),
      },
      annual: {
        amount: Number(row.annual_amount),
        description: makePlanDescription(row.label, row.max_patients, "annual"),
      },
      overageMonthlyAmount:
        row.overage_slot_amount === null
          ? resolved[row.tier].overageMonthlyAmount
          : Number(row.overage_slot_amount),
      capabilities: resolved[row.tier].capabilities,
    };
  }

  return resolved;
}

export async function getBillingPlans(): Promise<BillingPlanConfig> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("billing_plan_prices")
      .select(
        "tier, label, max_patients, monthly_amount, annual_amount, overage_slot_amount",
      );

    if (error) {
      return BILLING_PLANS;
    }

    return withFallback((data ?? []) as BillingPlanPriceRow[]);
  } catch {
    // If admin env is not available in runtime, keep the public landing page up
    // by falling back to static plan defaults.
    return BILLING_PLANS;
  }
}
