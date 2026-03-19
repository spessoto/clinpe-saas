"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const FREE_FOREVER_PATIENT_LIMIT = 10;

type ManagedTenant = {
  id: string;
  name: string;
  billing_tier: string;
  max_patients_allowed: number;
  subscription_status: string;
  subscription_expires_at: string | null;
  is_permanent_free_plan: boolean;
  trial_ends_at: string;
  trial_extension_days: number;
  trial_last_extended_at: string | null;
  permanent_free_granted_at: string | null;
};

function getTenantId(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) {
    redirect("/admin?error=Tenant%20inv%C3%A1lido.");
  }

  return tenantId;
}

function getExtensionDays(formData: FormData) {
  const rawValue = String(formData.get("days") ?? "").trim();
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 365) {
    redirect(
      "/admin?error=Informe%20uma%20quantidade%20de%20dias%20entre%201%20e%20365.",
    );
  }

  return parsed;
}

async function getManagedTenant(tenantId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("tenants")
    .select(
      "id, name, billing_tier, max_patients_allowed, subscription_status, subscription_expires_at, is_permanent_free_plan, trial_ends_at, trial_extension_days, trial_last_extended_at, permanent_free_granted_at",
    )
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    redirect("/admin?error=Tenant%20n%C3%A3o%20encontrado.");
  }

  return data as ManagedTenant;
}

async function insertAuditLog(input: {
  adminUserId: string;
  adminUserEmail: string;
  tenantId: string;
  action: string;
  previousState: Record<string, unknown>;
  nextState: Record<string, unknown>;
}) {
  const adminClient = createAdminClient();

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: input.adminUserId,
    admin_user_email: input.adminUserEmail,
    tenant_id: input.tenantId,
    action: input.action,
    previous_state: input.previousState,
    next_state: input.nextState,
  });
}

export async function enablePermanentFreePlanAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const tenantId = getTenantId(formData);
  const adminClient = createAdminClient();
  const tenant = await getManagedTenant(tenantId);

  if (tenant.is_permanent_free_plan) {
    redirect("/admin?status=free-already-enabled");
  }

  const nextState = {
    is_permanent_free_plan: true,
    billing_tier: "free_trial",
    max_patients_allowed: FREE_FOREVER_PATIENT_LIMIT,
    subscription_status: "trialing",
    subscription_expires_at: null,
    permanent_free_granted_at: new Date().toISOString(),
    permanent_free_granted_by_email: adminUser.email,
  };

  const { error } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (error) {
    redirect(
      `/admin?error=${encodeURIComponent(error.message ?? "Falha ao habilitar o plano free permanente.")}`,
    );
  }

  await insertAuditLog({
    adminUserId: adminUser.id,
    adminUserEmail: adminUser.email,
    tenantId,
    action: "enable_permanent_free_plan",
    previousState: {
      billing_tier: tenant.billing_tier,
      max_patients_allowed: tenant.max_patients_allowed,
      subscription_status: tenant.subscription_status,
      subscription_expires_at: tenant.subscription_expires_at,
      is_permanent_free_plan: tenant.is_permanent_free_plan,
    },
    nextState,
  });

  revalidatePath("/admin");
  revalidatePath("/billing");
  redirect("/admin?status=free-enabled");
}

export async function extendTenantTrialAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const tenantId = getTenantId(formData);
  const days = getExtensionDays(formData);
  const adminClient = createAdminClient();
  const tenant = await getManagedTenant(tenantId);

  if (tenant.is_permanent_free_plan) {
    redirect(
      "/admin?error=O%20tenant%20j%C3%A1%20est%C3%A1%20em%20free%20permanente.%20N%C3%A3o%20%C3%A9%20necess%C3%A1rio%20estender%20o%20trial.",
    );
  }

  const nextTrialExtensionDays = (tenant.trial_extension_days ?? 0) + days;
  const nextState = {
    trial_extension_days: nextTrialExtensionDays,
    trial_last_extended_at: new Date().toISOString(),
    trial_last_extended_by_email: adminUser.email,
  };

  const { error } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (error) {
    redirect(
      `/admin?error=${encodeURIComponent(error.message ?? "Falha ao estender o trial.")}`,
    );
  }

  await insertAuditLog({
    adminUserId: adminUser.id,
    adminUserEmail: adminUser.email,
    tenantId,
    action: "extend_trial",
    previousState: {
      trial_ends_at: tenant.trial_ends_at,
      trial_extension_days: tenant.trial_extension_days,
      trial_last_extended_at: tenant.trial_last_extended_at,
    },
    nextState: {
      ...nextState,
      extended_days: days,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/billing");
  redirect(`/admin?status=trial-extended&days=${days}`);
}
