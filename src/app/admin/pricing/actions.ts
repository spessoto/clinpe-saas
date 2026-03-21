"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BILLING_PLANS,
  type BillingPlanConfig,
  type BillingTier,
} from "@/app/billing/plans";

type BillingPlanPriceRow = {
  tier: BillingTier;
  label: string;
  max_patients: number;
  monthly_amount: number;
  annual_amount: number;
  updated_at: string;
  updated_by_email: string | null;
};

function getTier(formData: FormData): BillingTier {
  const value = String(formData.get("tier") ?? "").trim() as BillingTier;
  if (!value || !["tier_1", "tier_2", "tier_3"].includes(value)) {
    redirect("/admin/pricing?error=Plano%20inválido");
  }

  return value;
}

function getNumberField(formData: FormData, key: string, min: number) {
  const raw = String(formData.get(key) ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < min) {
    redirect(
      `/admin/pricing?error=${encodeURIComponent(`Valor inválido para ${key}`)}`,
    );
  }

  return Math.round(parsed * 100) / 100;
}

function toBillingPlanConfig(rows: BillingPlanPriceRow[]): BillingPlanConfig {
  const resolved: BillingPlanConfig = structuredClone(BILLING_PLANS);

  for (const row of rows) {
    resolved[row.tier] = {
      label: row.label,
      maxPatients: row.max_patients,
      monthly: {
        amount: Number(row.monthly_amount),
        description: `PodoDesk ${row.label} – até ${row.max_patients} pacientes (mensal)`,
      },
      annual: {
        amount: Number(row.annual_amount),
        description: `PodoDesk ${row.label} – até ${row.max_patients} pacientes (anual)`,
      },
    };
  }

  return resolved;
}

export async function getAdminPricingData() {
  await requireAdminAccess();

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("billing_plan_prices")
    .select(
      "tier, label, max_patients, monthly_amount, annual_amount, updated_at, updated_by_email",
    )
    .order("tier", { ascending: true });

  if (error || !data) {
    return {
      plans: BILLING_PLANS,
      audit: [] as BillingPlanPriceRow[],
    };
  }

  return {
    plans: toBillingPlanConfig(data as BillingPlanPriceRow[]),
    audit: data as BillingPlanPriceRow[],
  };
}

export async function updateBillingPlanPriceAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const tier = getTier(formData);
  const maxPatients = getNumberField(formData, "max_patients", 1);
  const monthlyAmount = getNumberField(formData, "monthly_amount", 1);
  const annualAmount = getNumberField(formData, "annual_amount", 1);
  const label = String(formData.get("label") ?? "").trim();

  if (!label) {
    redirect("/admin/pricing?error=Nome%20do%20plano%20é%20obrigatório");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("billing_plan_prices").upsert(
    {
      tier,
      label,
      max_patients: Math.round(maxPatients),
      monthly_amount: monthlyAmount,
      annual_amount: annualAmount,
      updated_by_email: adminUser.email,
    },
    { onConflict: "tier" },
  );

  if (error) {
    redirect(
      `/admin/pricing?error=${encodeURIComponent(`Falha ao salvar plano: ${error.message}`)}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?success=Preço%20atualizado%20com%20sucesso");
}
