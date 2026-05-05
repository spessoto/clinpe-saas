import { redirect } from "next/navigation";

import {
  BILLING_PLANS,
  type BillingCapability,
  type BillingTier,
} from "@/app/(protected)/billing/plans";
import { getPanelAdminEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { checkTenantPaymentStatus, hasTenantAccess } from "@/lib/tenant-access";

export type AppUser = {
  id: string;
  tenant_id: string;
  full_name: string;
  professional_register: string | null;
  booking_slug: string | null;
  email: string;
  role: "owner" | "staff";
  is_admin: boolean;
  avatar_url: string | null;
  bio: string | null;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  cpf_cnpj: string | null;
  trial_ends_at: string;
  trial_extension_days: number;
  is_permanent_free_plan: boolean;
  subscription_expires_at: string | null;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_billing_method:
    | "BOLETO"
    | "CREDIT_CARD"
    | "PIX"
    | "UNDEFINED"
    | null;
  billing_tier: "free_trial" | "tier_1" | "tier_2" | "tier_3";
  max_patients_allowed: number;
  logo_url: string | null;
  evolution_instance_name: string | null;
  evolution_instance_token: string | null;
  whatsapp_status: string | null;
};

export function isConfiguredAdminEmail(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(adminEmail) && adminEmail === email.trim().toLowerCase();
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  return requireAuthenticatedUserWithClient(supabase);
}

async function requireAuthenticatedUserWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const withBookingSlugResult = await supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, booking_slug, email, role, is_admin, avatar_url, bio",
    )
    .eq("id", user.id)
    .single();

  let appUser = withBookingSlugResult.data as AppUser | null;

  if (!appUser && withBookingSlugResult.error) {
    const fallbackResult = await supabase
      .from("users")
      .select(
        "id, tenant_id, full_name, professional_register, booking_slug, email, role, is_admin, avatar_url:profile_photo_url",
      )
      .eq("id", user.id)
      .single();

    if (fallbackResult.data) {
      appUser = {
        ...(fallbackResult.data as Omit<AppUser, "bio">),
        bio: null,
      };
    } else {
      const fallback2Result = await supabase
        .from("users")
        .select(
          "id, tenant_id, full_name, professional_register, email, role, is_admin, avatar_url:profile_photo_url",
        )
        .eq("id", user.id)
        .single();

      if (fallback2Result.data) {
        appUser = {
          ...(fallback2Result.data as Omit<AppUser, "booking_slug" | "bio">),
          booking_slug: null,
          bio: null,
        };
      }
    }
  }

  if (!appUser) {
    redirect(
      "/sign-in?error=Conta autenticada sem perfil interno. Rode as migrations e tente novamente.",
    );
  }

  return appUser as AppUser;
}

export async function requireAdminAccess() {
  const supabase = await createClient();
  const appUser = await requireAuthenticatedUserWithClient(supabase);

  // Check if user has admin role in database
  if (!appUser.is_admin) {
    // Fallback to ADMIN_EMAIL env var for backwards compatibility
    const { ADMIN_EMAIL } = getPanelAdminEnv();
    if (
      appUser.email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()
    ) {
      redirect(
        `/billing?error=${encodeURIComponent("Acesso administrativo negado.")}`,
      );
    }
  }

  return appUser;
}

export async function requireActiveTenant() {
  const supabase = await createClient();
  const appUser = await requireAuthenticatedUserWithClient(supabase);

  // Redirect admins to admin panel
  if (appUser.is_admin || isConfiguredAdminEmail(appUser.email)) {
    redirect("/admin");
  }

  const withSlugResult = await supabase
    .from("tenants")
    .select(
      "id, name, slug, cpf_cnpj, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_expires_at, subscription_status, subscription_billing_method, billing_tier, max_patients_allowed, logo_url, evolution_instance_name, evolution_instance_token, whatsapp_status",
    )
    .eq("id", appUser.tenant_id)
    .single();

  let tenant = withSlugResult.data as Tenant | null;

  if (!tenant && withSlugResult.error) {
    const fallbackResult = await supabase
      .from("tenants")
      .select("id, name, slug, cpf_cnpj, trial_ends_at, subscription_status")
      .eq("id", appUser.tenant_id)
      .single();

    if (fallbackResult.data) {
      tenant = {
        ...(fallbackResult.data as Omit<
          Tenant,
          | "cpf_cnpj"
          | "trial_extension_days"
          | "is_permanent_free_plan"
          | "subscription_expires_at"
          | "subscription_billing_method"
          | "billing_tier"
          | "max_patients_allowed"
          | "logo_url"
          | "evolution_instance_name"
          | "evolution_instance_token"
          | "whatsapp_status"
        >),
        cpf_cnpj: null,
        trial_extension_days: 0,
        is_permanent_free_plan: false,
        subscription_expires_at: null,
        subscription_billing_method: null,
        billing_tier: "free_trial",
        max_patients_allowed: 10,
        logo_url: null,
        evolution_instance_name: null,
        evolution_instance_token: null,
        whatsapp_status: null,
      };
    } else {
      const fallback2Result = await supabase
        .from("tenants")
        .select("id, name, cpf_cnpj, trial_ends_at, subscription_status")
        .eq("id", appUser.tenant_id)
        .single();

      if (fallback2Result.data) {
        tenant = {
          ...(fallback2Result.data as Omit<
            Tenant,
            | "slug"
            | "cpf_cnpj"
            | "trial_extension_days"
            | "is_permanent_free_plan"
            | "subscription_expires_at"
            | "subscription_billing_method"
            | "billing_tier"
            | "max_patients_allowed"
            | "logo_url"
            | "evolution_instance_name"
            | "evolution_instance_token"
            | "whatsapp_status"
          >),
          slug: "",
          cpf_cnpj: null,
          trial_extension_days: 0,
          is_permanent_free_plan: false,
          subscription_expires_at: null,
          subscription_billing_method: null,
          billing_tier: "free_trial",
          max_patients_allowed: 10,
          logo_url: null,
          evolution_instance_name: null,
          evolution_instance_token: null,
          whatsapp_status: null,
        };
      }
    }
  }

  if (!tenant) {
    redirect(
      "/sign-in?error=Tenant da conta não encontrado. Verifique migrations do Supabase.",
    );
  }

  const paymentStatus = checkTenantPaymentStatus(tenant as Tenant);
  if (paymentStatus === "no_access") {
    redirect("/billing");
  }
  if (paymentStatus === "past_due") {
    redirect("/payment-regularization");
  }

  return { appUser, tenant: tenant as Tenant };
}

export async function requireOwnerAccess() {
  const result = await requireActiveTenant();
  if (result.appUser.role !== "owner") {
    redirect(
      "/dashboard?error=" +
        encodeURIComponent("Acesso restrito ao proprietário da clínica."),
    );
  }
  return result;
}

function getTenantPlanTier(
  tenant: Pick<Tenant, "billing_tier">,
): BillingTier | null {
  return tenant.billing_tier === "free_trial" ? null : tenant.billing_tier;
}

export function tenantHasCapability(
  tenant: Pick<Tenant, "billing_tier" | "is_permanent_free_plan">,
  capability: BillingCapability,
) {
  if (tenant.is_permanent_free_plan || tenant.billing_tier === "free_trial") {
    return true;
  }

  const tier = getTenantPlanTier(tenant as Pick<Tenant, "billing_tier">);
  if (!tier) {
    return false;
  }

  return BILLING_PLANS[tier].capabilities.includes(capability);
}

export async function requirePlanCapability(
  capability: BillingCapability,
  upgradeMessage?: string,
) {
  const result = await requireActiveTenant();

  if (!tenantHasCapability(result.tenant, capability)) {
    redirect(
      "/billing?error=" +
        encodeURIComponent(
          upgradeMessage ??
            "Seu plano atual não inclui este módulo. Faça upgrade para acessar.",
        ),
    );
  }

  return result;
}

export async function requireOwnerPlanCapability(
  capability: BillingCapability,
  upgradeMessage?: string,
) {
  const result = await requireOwnerAccess();

  if (!tenantHasCapability(result.tenant, capability)) {
    redirect(
      "/billing?error=" +
        encodeURIComponent(
          upgradeMessage ??
            "Seu plano atual não inclui este módulo. Faça upgrade para acessar.",
        ),
    );
  }

  return result;
}

export async function requireTier3Owner() {
  const result = await requireOwnerAccess();
  if (result.tenant.billing_tier !== "tier_3") {
    redirect(
      "/billing?error=" +
        encodeURIComponent(
          "Funcionalidade exclusiva do plano Clínica. Faça upgrade para acessar.",
        ),
    );
  }
  return result;
}
