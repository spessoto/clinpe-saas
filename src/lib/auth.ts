import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AppUser = {
  id: string;
  tenant_id: string;
  full_name: string;
  professional_register: string | null;
  booking_slug: string | null;
  email: string;
  role: "owner" | "staff";
  avatar_url: string | null;
  bio: string | null;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  trial_ends_at: string;
  subscription_status: "trialing" | "active" | "past_due";
  billing_tier: "free_trial" | "tier_1" | "tier_2" | "tier_3";
  max_patients_allowed: number;
  logo_url: string | null;
};

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
      "id, tenant_id, full_name, professional_register, booking_slug, email, role, avatar_url, bio",
    )
    .eq("id", user.id)
    .single();

  let appUser = withBookingSlugResult.data as AppUser | null;

  if (!appUser && withBookingSlugResult.error) {
    // Fallback 1: Try without avatar/bio columns (migration 8 may not have run)
    const fallbackResult = await supabase
      .from("users")
      .select(
        "id, tenant_id, full_name, professional_register, booking_slug, email, role, avatar_url:profile_photo_url",
      )
      .eq("id", user.id)
      .single();

    if (fallbackResult.data) {
      appUser = {
        ...(fallbackResult.data as Omit<AppUser, "bio">),
        bio: null,
      };
    } else {
      // Fallback 2: Try without booking_slug (migration 5 or 6 may not have run)
      const fallback2Result = await supabase
        .from("users")
        .select(
          "id, tenant_id, full_name, professional_register, email, role, avatar_url:profile_photo_url",
        )
        .eq("id", user.id)
        .single();

      if (fallback2Result.data) {
        appUser = {
          ...(fallback2Result.data as Omit<
            AppUser,
            "booking_slug" | "bio"
          >),
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

export async function requireActiveTenant() {
  const supabase = await createClient();
  const appUser = await requireAuthenticatedUserWithClient(supabase);

  const withSlugResult = await supabase
    .from("tenants")
    .select(
      "id, name, slug, trial_ends_at, subscription_status, billing_tier, max_patients_allowed, logo_url",
    )
    .eq("id", appUser.tenant_id)
    .single();

  // Backward compatibility: tenant slug was introduced in a later migration.
  // If migration 000004 has not run yet, fallback avoids login loop.
  let tenant = withSlugResult.data as Tenant | null;

  if (!tenant && withSlugResult.error) {
    // Fallback 1: Try without billing/logo columns (migration 8 may not have run)
    const fallbackResult = await supabase
      .from("tenants")
      .select("id, name, slug, trial_ends_at, subscription_status")
      .eq("id", appUser.tenant_id)
      .single();

    if (fallbackResult.data) {
      tenant = {
        ...(fallbackResult.data as Omit<
          Tenant,
          "billing_tier" | "max_patients_allowed" | "logo_url"
        >),
        billing_tier: "free_trial",
        max_patients_allowed: 10,
        logo_url: null,
      };
    } else {
      // Fallback 2: Try without slug (migration 4 may not have run)
      const fallback2Result = await supabase
        .from("tenants")
        .select("id, name, trial_ends_at, subscription_status")
        .eq("id", appUser.tenant_id)
        .single();

      if (fallback2Result.data) {
        tenant = {
          ...(fallback2Result.data as Omit<
            Tenant,
            "slug" | "billing_tier" | "max_patients_allowed" | "logo_url"
          >),
          slug: "",
          billing_tier: "free_trial",
          max_patients_allowed: 10,
          logo_url: null,
        };
      }
    }
  }

  if (!tenant) {
    redirect(
      "/sign-in?error=Tenant da conta não encontrado. Verifique migrations do Supabase.",
    );
  }

  const isExpired =
    tenant.subscription_status !== "active" &&
    new Date(tenant.trial_ends_at).getTime() < Date.now();

  if (isExpired) {
    redirect("/billing");
  }

  return { appUser, tenant: tenant as Tenant };
}
