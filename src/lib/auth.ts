import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AppUser = {
  id: string;
  tenant_id: string;
  full_name: string;
  professional_register: string | null;
  email: string;
  role: "owner" | "staff";
};

type Tenant = {
  id: string;
  name: string;
  trial_ends_at: string;
  subscription_status: "trialing" | "active" | "past_due";
};

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, tenant_id, full_name, professional_register, email, role")
    .eq("id", user.id)
    .single();

  if (!appUser) {
    redirect("/sign-in");
  }

  return appUser as AppUser;
}

export async function requireActiveTenant() {
  const supabase = await createClient();
  const appUser = await requireAuthenticatedUser();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, trial_ends_at, subscription_status")
    .eq("id", appUser.tenant_id)
    .single();

  if (!tenant) {
    redirect("/sign-in");
  }

  const isExpired =
    tenant.subscription_status !== "active" &&
    new Date(tenant.trial_ends_at).getTime() < Date.now();

  if (isExpired) {
    redirect("/billing");
  }

  return { appUser, tenant: tenant as Tenant };
}
