"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTrialEnd } from "@/lib/tenant-access";

type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  billing_tier: "free_trial" | "tier_1" | "tier_2" | "tier_3";
  max_patients_allowed: number;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_expires_at: string | null;
  trial_ends_at: string;
  trial_extension_days: number;
  is_permanent_free_plan: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  tenant_id: string;
  role: "owner" | "staff";
  client: TenantSummary | null;
  stats: {
    professionals: number;
    patients: number;
    appointments_month: number;
    appointments_total: number;
  };
  plan_label: string;
  renewal_date: string;
  renewal_days_left: number | null;
};

const ADMIN_USERS_PAGE_SIZE = 50;
const FREE_FOREVER_PATIENT_LIMIT = 10;

type AdminUsersListResult = {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getPlanLabel(tenant: TenantSummary | null) {
  if (!tenant) {
    return "Sem cliente";
  }

  if (tenant.is_permanent_free_plan) {
    return "Free permanente";
  }

  switch (tenant.billing_tier) {
    case "tier_1":
      return "Essencial";
    case "tier_2":
      return "Pro";
    case "tier_3":
      return "Clínica";
    default:
      return "Free / Trial";
  }
}

function getRenewalDate(tenant: TenantSummary | null) {
  if (!tenant) {
    return "-";
  }

  if (tenant.is_permanent_free_plan) {
    return "Sem vencimento";
  }

  if (
    tenant.subscription_status === "active" &&
    tenant.subscription_expires_at
  ) {
    return tenant.subscription_expires_at;
  }

  return getEffectiveTrialEnd(tenant).toISOString();
}

function getRenewalDaysLeft(tenant: TenantSummary | null) {
  if (!tenant || tenant.is_permanent_free_plan) {
    return null;
  }

  const renewalDate = getRenewalDate(tenant);
  const parsed = new Date(renewalDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function buildCountMap<Key extends string>(
  items: Array<Record<Key, string>>,
  key: Key,
) {
  return items.reduce((map, item) => {
    const value = item[key];
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

export async function getAdminUsersList(
  page = 1,
): Promise<AdminUsersListResult> {
  await requireAdminAccess();

  const adminClient = createAdminClient();
  const currentPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (currentPage - 1) * ADMIN_USERS_PAGE_SIZE;
  const to = from + ADMIN_USERS_PAGE_SIZE - 1;

  const { data, error, count } = await adminClient
    .from("users")
    .select("id, tenant_id, email, full_name, role, is_admin, created_at", {
      count: "exact",
    })
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar usuários: ${error.message}`);
  }

  const baseUsers = (data || []) as Array<
    Pick<
      AdminUser,
      | "id"
      | "tenant_id"
      | "email"
      | "full_name"
      | "is_admin"
      | "created_at"
      | "role"
    >
  >;

  const tenantIds = Array.from(
    new Set(baseUsers.map((user) => user.tenant_id)),
  );
  const userIds = baseUsers.map((user) => user.id);
  // UTC-safe month boundaries
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [
    tenantsResult,
    tenantUsersResult,
    patientsResult,
    appointmentsResult,
    appointmentsByProfessionalResult,
  ] =
    tenantIds.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]
      : await Promise.all([
          adminClient
            .from("tenants")
            .select(
              "id, name, slug, created_at, billing_tier, max_patients_allowed, subscription_status, subscription_expires_at, trial_ends_at, trial_extension_days, is_permanent_free_plan",
            )
            .in("id", tenantIds),
          adminClient
            .from("users")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          adminClient
            .from("patients")
            .select("tenant_id")
            .in("tenant_id", tenantIds),
          adminClient
            .from("appointments")
            .select("tenant_id")
            .in("tenant_id", tenantIds)
            .gte("scheduled_at", monthStart.toISOString())
            .lt("scheduled_at", monthEnd.toISOString()),
          adminClient
            .from("appointments")
            .select("professional_id")
            .in("professional_id", userIds),
        ]);

  const tenantsById = new Map(
    ((tenantsResult.data ?? []) as TenantSummary[]).map((tenant) => [
      tenant.id,
      tenant,
    ]),
  );

  const professionalsByTenant = buildCountMap(
    (tenantUsersResult.data ?? []) as Array<{ tenant_id: string }>,
    "tenant_id",
  );
  const patientsByTenant = buildCountMap(
    (patientsResult.data ?? []) as Array<{ tenant_id: string }>,
    "tenant_id",
  );
  const appointmentsByTenant = buildCountMap(
    (appointmentsResult.data ?? []) as Array<{ tenant_id: string }>,
    "tenant_id",
  );
  const appointmentsByProfessional = buildCountMap(
    (appointmentsByProfessionalResult.data ?? []) as Array<{
      professional_id: string;
    }>,
    "professional_id",
  );

  const users = baseUsers.map((user) => {
    const client = tenantsById.get(user.tenant_id) ?? null;
    return {
      ...user,
      client,
      stats: {
        professionals: professionalsByTenant.get(user.tenant_id) ?? 0,
        patients: patientsByTenant.get(user.tenant_id) ?? 0,
        appointments_month: appointmentsByTenant.get(user.tenant_id) ?? 0,
        appointments_total: appointmentsByProfessional.get(user.id) ?? 0,
      },
      plan_label: getPlanLabel(client),
      renewal_date: getRenewalDate(client),
      renewal_days_left: getRenewalDaysLeft(client),
    } satisfies AdminUser;
  });

  const resolvedCount = typeof count === "number" ? count : users.length;
  const totalPages = Math.max(
    1,
    Math.ceil(resolvedCount / ADMIN_USERS_PAGE_SIZE),
  );

  return {
    users,
    totalCount: resolvedCount,
    page: currentPage,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    totalPages,
  };
}

export async function toggleAdminRoleAction(formData: FormData) {
  const currentAdmin = await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!userId || userId.length === 0) {
    redirect(`/admin/users?${pageQuery}&error=ID%20de%20usuário%20inválido`);
  }

  const adminClient = createAdminClient();

  const { data: userData, error: userError } = await adminClient
    .from("users")
    .select("is_admin, email, tenant_id")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    redirect(`/admin/users?${pageQuery}&error=Usuário%20não%20encontrado`);
  }

  const currentIsAdmin = userData.is_admin;
  const newIsAdmin = !currentIsAdmin;

  if (currentIsAdmin && userId === currentAdmin.id) {
    const { count } = await adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);

    if (count === 1) {
      redirect(
        `/admin/users?${pageQuery}&error=Não%20é%20possível%20revogar%20seu%20acesso%20admin%20se%20você%20for%20o%20único%20admin`,
      );
    }
  }

  const { error: updateError } = await adminClient
    .from("users")
    .update({ is_admin: newIsAdmin })
    .eq("id", userId);

  if (updateError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent("Erro ao atualizar admin: " + updateError.message)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: currentAdmin.id,
    admin_user_email: currentAdmin.email,
    tenant_id: userData.tenant_id,
    action: newIsAdmin ? "promote_user_admin" : "revoke_user_admin",
    previous_state: {
      target_user_id: userId,
      target_user_email: userData.email,
      is_admin: currentIsAdmin,
    },
    next_state: {
      target_user_id: userId,
      target_user_email: userData.email,
      is_admin: newIsAdmin,
    },
  });

  revalidatePath("/admin/users");

  const action = newIsAdmin ? "promovido" : "rebaixado";
  redirect(
    `/admin/users?${pageQuery}&success=${encodeURIComponent(`Usuário foi ${action} com sucesso`)}`,
  );
}

export async function deleteUserAction(formData: FormData) {
  const currentAdmin = await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!userId) {
    redirect(`/admin/users?${pageQuery}&error=ID%20de%20usuário%20inválido`);
  }

  if (userId === currentAdmin.id) {
    redirect(
      `/admin/users?${pageQuery}&error=Não%20é%20possível%20excluir%20seu%20próprio%20usuário`,
    );
  }

  const adminClient = createAdminClient();

  const { data: targetUser, error: targetUserError } = await adminClient
    .from("users")
    .select("id, email, full_name, tenant_id, is_admin")
    .eq("id", userId)
    .single();

  if (targetUserError || !targetUser) {
    redirect(`/admin/users?${pageQuery}&error=Usuário%20não%20encontrado`);
  }

  if (targetUser.is_admin) {
    redirect(
      `/admin/users?${pageQuery}&error=Admins%20não%20podem%20ser%20excluídos.%20Desative%20o%20admin%20no%20switch%20primeiro`,
    );
  }

  const { error: appointmentSnapshotError } = await adminClient
    .from("appointments")
    .update({
      professional_name_snapshot: targetUser.full_name,
    })
    .eq("professional_id", userId);

  if (appointmentSnapshotError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao preservar histórico de consultas do usuário: ${appointmentSnapshotError.message}`)}`,
    );
  }

  const { error: deleteAuthError } =
    await adminClient.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao excluir usuário: ${deleteAuthError.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: currentAdmin.id,
    admin_user_email: currentAdmin.email,
    tenant_id: targetUser.tenant_id,
    action: "delete_user",
    previous_state: {
      target_user_id: targetUser.id,
      target_user_email: targetUser.email,
      is_admin: targetUser.is_admin,
    },
    next_state: null,
  });

  revalidatePath("/admin/users");
  redirect(
    `/admin/users?${pageQuery}&success=${encodeURIComponent("Usuário excluído com sucesso. Consultas e pacientes foram preservados sem reatribuição para outros profissionais.")}`,
  );
}

export async function enableClientPermanentFreeFromUsersAction(
  formData: FormData,
) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!tenantId) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20inválido`);
  }

  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select(
      "id, billing_tier, max_patients_allowed, subscription_status, subscription_expires_at, is_permanent_free_plan",
    )
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20não%20encontrado`);
  }

  if (tenant.is_permanent_free_plan) {
    redirect(
      `/admin/users?${pageQuery}&success=Cliente%20já%20está%20em%20free%20permanente`,
    );
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

  const { error: updateError } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (updateError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao habilitar free permanente: ${updateError.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: tenantId,
    action: "enable_permanent_free_plan_from_users",
    previous_state: {
      billing_tier: tenant.billing_tier,
      max_patients_allowed: tenant.max_patients_allowed,
      subscription_status: tenant.subscription_status,
      subscription_expires_at: tenant.subscription_expires_at,
      is_permanent_free_plan: tenant.is_permanent_free_plan,
    },
    next_state: nextState,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/billing");
  redirect(`/admin/users?${pageQuery}&success=Free%20permanente%20ativado`);
}

export async function revokeClientPermanentFreeFromUsersAction(
  formData: FormData,
) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!tenantId) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20inválido`);
  }

  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select("id, is_permanent_free_plan")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20não%20encontrado`);
  }

  if (!tenant.is_permanent_free_plan) {
    redirect(
      `/admin/users?${pageQuery}&success=Cliente%20não%20está%20em%20free%20permanente`,
    );
  }

  const nextState = {
    is_permanent_free_plan: false,
    permanent_free_granted_at: null,
    permanent_free_granted_by_email: null,
  };

  const { error: updateError } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (updateError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao remover free permanente: ${updateError.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: tenantId,
    action: "revoke_permanent_free_plan",
    previous_state: { is_permanent_free_plan: true },
    next_state: { is_permanent_free_plan: false },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/billing");
  redirect(`/admin/users?${pageQuery}&success=Free%20permanente%20removido`);
}

export async function extendClientTrialAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const extraDays = Number.parseInt(
    String(formData.get("extra_days") ?? "0"),
    10,
  );
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!tenantId) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20inválido`);
  }

  if (!Number.isFinite(extraDays) || extraDays <= 0) {
    redirect(
      `/admin/users?${pageQuery}&error=Informe%20um%20número%20de%20dias%20válido`,
    );
  }

  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select("id, trial_extension_days")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20não%20encontrado`);
  }

  const currentExtensionDays = (tenant.trial_extension_days as number) ?? 0;
  const newExtensionDays = currentExtensionDays + extraDays;

  const nextState = {
    trial_extension_days: newExtensionDays,
    trial_last_extended_at: new Date().toISOString(),
    trial_last_extended_by_email: adminUser.email,
  };

  const { error: updateError } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (updateError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao estender trial: ${updateError.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: tenantId,
    action: "extend_trial",
    previous_state: { trial_extension_days: currentExtensionDays },
    next_state: {
      trial_extension_days: newExtensionDays,
      extra_days_added: extraDays,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect(
    `/admin/users?${pageQuery}&success=${encodeURIComponent(`Trial estendido em ${extraDays} dia(s)`)}`,
  );
}

const TIER_MAX_PATIENTS: Record<string, number> = {
  tier_1: 30,
  tier_2: 80,
  tier_3: 150,
};

const TIER_LABELS: Record<string, string> = {
  tier_1: "Essencial",
  tier_2: "Pro",
  tier_3: "Clínica",
};

export async function grantFreePlanAction(formData: FormData) {
  const adminUser = await requireAdminAccess();
  const adminClient = createAdminClient();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const tier = String(formData.get("tier") ?? "").trim() as
    | "tier_1"
    | "tier_2"
    | "tier_3";
  const expiryInput = String(formData.get("expires_at") ?? "").trim();
  const permanent = formData.get("permanent") === "1";
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;

  if (!tenantId) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20inválido`);
  }

  if (!["tier_1", "tier_2", "tier_3"].includes(tier)) {
    redirect(`/admin/users?${pageQuery}&error=Plano%20inválido`);
  }

  let expiresAt: string | null = null;
  if (!permanent) {
    if (!expiryInput) {
      redirect(
        `/admin/users?${pageQuery}&error=Informe%20a%20data%20de%20expiração%20ou%20marque%20como%20permanente`,
      );
    }
    const parsed = new Date(expiryInput);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
      redirect(
        `/admin/users?${pageQuery}&error=Data%20de%20expiração%20inválida`,
      );
    }
    expiresAt = parsed.toISOString();
  }

  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select(
      "id, billing_tier, max_patients_allowed, subscription_status, subscription_expires_at, is_permanent_free_plan",
    )
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    redirect(`/admin/users?${pageQuery}&error=Cliente%20não%20encontrado`);
  }

  // Fetch max_patients from billing_plan_prices if available, fallback to hardcoded map
  const { data: planPrice } = await adminClient
    .from("billing_plan_prices")
    .select("max_patients")
    .eq("tier", tier)
    .maybeSingle();

  const maxPatients = planPrice?.max_patients ?? TIER_MAX_PATIENTS[tier] ?? 30;

  const nextState = {
    billing_tier: tier,
    max_patients_allowed: maxPatients,
    subscription_status: "active" as const,
    subscription_expires_at: expiresAt,
    is_permanent_free_plan: false,
    free_plan_granted_at: new Date().toISOString(),
    free_plan_granted_by_email: adminUser.email,
    free_plan_tier: tier,
  };

  const { error: updateError } = await adminClient
    .from("tenants")
    .update(nextState)
    .eq("id", tenantId);

  if (updateError) {
    redirect(
      `/admin/users?${pageQuery}&error=${encodeURIComponent(`Falha ao conceder plano: ${updateError.message}`)}`,
    );
  }

  await adminClient.from("admin_audit_log").insert({
    admin_user_id: adminUser.id,
    admin_user_email: adminUser.email,
    tenant_id: tenantId,
    action: "grant_free_paid_plan",
    previous_state: {
      billing_tier: tenant.billing_tier,
      max_patients_allowed: tenant.max_patients_allowed,
      subscription_status: tenant.subscription_status,
      subscription_expires_at: tenant.subscription_expires_at,
      is_permanent_free_plan: tenant.is_permanent_free_plan,
    },
    next_state: nextState,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/billing");
  redirect(
    `/admin/users?${pageQuery}&success=${encodeURIComponent(`Plano ${TIER_LABELS[tier]} concedido gratuitamente${permanent ? " (sem expiração)" : ""}`)}`,
  );
}
