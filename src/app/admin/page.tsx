import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  enablePermanentFreePlanAction,
  extendTenantTrialAction,
} from "@/app/admin/actions";
import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTrialEnd, hasTenantAccess } from "@/lib/tenant-access";

export const revalidate = 1800;

type SearchParams = Promise<{
  status?: string;
  error?: string;
  days?: string;
}>;

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  trial_ends_at: string;
  trial_extension_days: number;
  trial_last_extended_at: string | null;
  is_permanent_free_plan: boolean;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_expires_at: string | null;
  billing_tier: "free_trial" | "tier_1" | "tier_2" | "tier_3";
  max_patients_allowed: number;
};

type AppUserRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: "owner" | "staff";
};

type AppointmentRow = {
  tenant_id: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "canceled";
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPlanLabel(tenant: TenantRow) {
  if (tenant.is_permanent_free_plan) {
    return "Free permanente";
  }

  switch (tenant.billing_tier) {
    case "tier_1":
      return "Starter";
    case "tier_2":
      return "Pro";
    case "tier_3":
      return "Clínica";
    default:
      return "Free / Trial";
  }
}

function getAccessLabel(tenant: TenantRow) {
  if (tenant.is_permanent_free_plan) {
    return {
      label: "Free permanente",
      tone: "bg-success/10 text-success",
    };
  }

  if (tenant.subscription_status === "past_due") {
    return {
      label: hasTenantAccess(tenant) ? "Em regularização" : "Em atraso",
      tone: "bg-warning/10 text-warning",
    };
  }

  if (tenant.subscription_status === "active") {
    return {
      label: hasTenantAccess(tenant)
        ? "Assinatura ativa"
        : "Assinatura vencida",
      tone: hasTenantAccess(tenant)
        ? "bg-primary/10 text-primary"
        : "bg-destructive/10 text-destructive",
    };
  }

  return {
    label: hasTenantAccess(tenant) ? "Trial ativo" : "Bloqueado",
    tone: hasTenantAccess(tenant)
      ? "bg-secondary/10 text-secondary"
      : "bg-destructive/10 text-destructive",
  };
}

function getRenewalLabel(tenant: TenantRow) {
  if (tenant.is_permanent_free_plan) {
    return "Sem vencimento";
  }

  if (
    tenant.subscription_status === "active" &&
    tenant.subscription_expires_at
  ) {
    return formatDate(tenant.subscription_expires_at);
  }

  return formatDate(getEffectiveTrialEnd(tenant).toISOString());
}

function buildCountMap(items: Array<{ tenant_id: string }>) {
  return items.reduce((map, item) => {
    map.set(item.tenant_id, (map.get(item.tenant_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminAccess();

  const adminClient = createAdminClient();
  const params = await searchParams;
  const now = new Date();
  const next7Days = new Date(now);
  next7Days.setDate(next7Days.getDate() + 7);
  const next30Days = new Date(now);
  next30Days.setDate(next30Days.getDate() + 30);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [tenantsResult, usersResult, patientsResult, appointmentsResult] =
    await Promise.all([
      adminClient
        .from("tenants")
        .select(
          "id, name, slug, created_at, trial_ends_at, trial_extension_days, trial_last_extended_at, is_permanent_free_plan, subscription_status, subscription_expires_at, billing_tier, max_patients_allowed",
        )
        .order("created_at", { ascending: false }),
      adminClient
        .from("users")
        .select("id, tenant_id, full_name, email, role")
        .order("full_name", { ascending: true }),
      adminClient.from("patients").select("tenant_id"),
      adminClient
        .from("appointments")
        .select("tenant_id, scheduled_at, status"),
    ]);

  const tenants = (tenantsResult.data ?? []) as TenantRow[];
  const users = (usersResult.data ?? []) as AppUserRow[];
  const patients = (patientsResult.data ?? []) as Array<{ tenant_id: string }>;
  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];

  const patientsByTenant = buildCountMap(patients);
  const professionalsByTenant = buildCountMap(
    users.map((user) => ({ tenant_id: user.tenant_id })),
  );
  const ownersByTenant = users.reduce((map, user) => {
    if (user.role === "owner" && !map.has(user.tenant_id)) {
      map.set(user.tenant_id, user);
    }
    return map;
  }, new Map<string, AppUserRow>());
  const appointmentsThisMonthByTenant = appointments.reduce(
    (map, appointment) => {
      const scheduledAt = new Date(appointment.scheduled_at);
      if (scheduledAt >= monthStart && scheduledAt < monthEnd) {
        map.set(
          appointment.tenant_id,
          (map.get(appointment.tenant_id) ?? 0) + 1,
        );
      }
      return map;
    },
    new Map<string, number>(),
  );

  const completedThisMonth = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return (
      appointment.status === "completed" &&
      scheduledAt >= monthStart &&
      scheduledAt < monthEnd
    );
  }).length;

  const activeTenants = tenants.filter((tenant) =>
    hasTenantAccess(tenant),
  ).length;
  const permanentFreeTenants = tenants.filter(
    (tenant) => tenant.is_permanent_free_plan,
  ).length;
  const pastDueTenants = tenants.filter(
    (tenant) =>
      tenant.subscription_status === "past_due" &&
      !tenant.is_permanent_free_plan,
  ).length;
  const trialsEndingSoon = tenants.filter((tenant) => {
    if (
      tenant.is_permanent_free_plan ||
      tenant.subscription_status === "active"
    ) {
      return false;
    }

    const effectiveTrialEnd = getEffectiveTrialEnd(tenant);
    return effectiveTrialEnd >= now && effectiveTrialEnd <= next7Days;
  }).length;
  const renewalsNext30Days = tenants.filter((tenant) => {
    if (!tenant.subscription_expires_at || tenant.is_permanent_free_plan) {
      return false;
    }

    const renewalDate = new Date(tenant.subscription_expires_at);
    return renewalDate >= now && renewalDate <= next30Days;
  }).length;

  const totalPatients = patients.length;
  const appointmentsThisMonth = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return scheduledAt >= monthStart && scheduledAt < monthEnd;
  }).length;

  const cards = [
    {
      title: "Tenants ativos",
      value: activeTenants,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Free permanente",
      value: permanentFreeTenants,
      tone: "bg-success/10 text-success",
    },
    {
      title: "Trials vencendo em 7 dias",
      value: trialsEndingSoon,
      tone: "bg-warning/10 text-warning",
    },
    {
      title: "Renovações em 30 dias",
      value: renewalsNext30Days,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      title: "Tenants em atraso",
      value: pastDueTenants,
      tone: "bg-destructive/10 text-destructive",
    },
    {
      title: "Profissionais cadastrados",
      value: users.length,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      title: "Pacientes totais",
      value: totalPatients,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Consultas do mês",
      value: appointmentsThisMonth,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Consultas concluídas no mês",
      value: completedThisMonth,
      tone: "bg-success/10 text-success",
    },
  ];

  const statusMessage = (() => {
    switch (params.status) {
      case "free-enabled":
        return "Plano free permanente habilitado com sucesso.";
      case "free-already-enabled":
        return "O tenant já estava configurado com free permanente.";
      case "trial-extended":
        return `Trial estendido com sucesso em ${params.days ?? "0"} dia(s).`;
      default:
        return null;
    }
  })();

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            <ShieldCheck className="size-3.5" />
            Admin ClinPé
          </span>
          <h1 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">
            Gestão da plataforma
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Visão central de billing, renovação e atividade operacional com
            métricas agregadas. Este painel não expõe dados pessoais de
            pacientes.
          </p>
        </div>

        <Link href="/billing" className="btn-outline-modern">
          Abrir billing do tenant
        </Link>
      </div>

      {statusMessage ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <p className="text-sm text-success">{statusMessage}</p>
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {decodeURIComponent(params.error)}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="soft-panel p-5">
            <p className="text-sm text-muted">{card.title}</p>
            <p
              className={`mt-3 inline-flex rounded-md px-3 py-1 text-2xl font-bold ${card.tone}`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <article className="surface-card overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-secondary">
              Tenants monitorados
            </h2>
            <p className="mt-1 text-sm text-muted">
              Renovação, status de acesso, capacidade e ações administrativas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Clínica</th>
                  <th className="px-5 py-3 font-semibold">
                    Owner / Profissionais
                  </th>
                  <th className="px-5 py-3 font-semibold">Plano</th>
                  <th className="px-5 py-3 font-semibold">Renovação</th>
                  <th className="px-5 py-3 font-semibold">Pacientes</th>
                  <th className="px-5 py-3 font-semibold">Consultas mês</th>
                  <th className="px-5 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tenants.map((tenant) => {
                  const owner = ownersByTenant.get(tenant.id);
                  const accessLabel = getAccessLabel(tenant);
                  const patientCount = patientsByTenant.get(tenant.id) ?? 0;
                  const professionalCount =
                    professionalsByTenant.get(tenant.id) ?? 0;
                  const appointmentsMonth =
                    appointmentsThisMonthByTenant.get(tenant.id) ?? 0;

                  return (
                    <tr key={tenant.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">
                          {tenant.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          /{tenant.slug}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Criado em {formatDate(tenant.created_at)}
                        </p>
                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accessLabel.tone}`}
                        >
                          {accessLabel.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {owner?.full_name ?? "Owner não encontrado"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {owner?.email ?? "-"}
                        </p>
                        <p className="mt-3 text-xs text-muted">
                          {professionalCount} profissional(is) cadastrado(s)
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {getPlanLabel(tenant)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Limite atual: {tenant.max_patients_allowed} pacientes
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Trial extra acumulado: {tenant.trial_extension_days}{" "}
                          dia(s)
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {getRenewalLabel(tenant)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Trial base: {formatDate(tenant.trial_ends_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {patientCount} / {tenant.max_patients_allowed}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Ocupação{" "}
                          {tenant.max_patients_allowed > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (patientCount / tenant.max_patients_allowed) *
                                    100,
                                ),
                              )
                            : 0}
                          %
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {appointmentsMonth}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Somente números agregados
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[240px] flex-col gap-3">
                          <form action={enablePermanentFreePlanAction}>
                            <input
                              type="hidden"
                              name="tenant_id"
                              value={tenant.id}
                            />
                            <button
                              type="submit"
                              disabled={tenant.is_permanent_free_plan}
                              className="w-full rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-semibold text-success transition hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {tenant.is_permanent_free_plan
                                ? "Free permanente ativo"
                                : "Habilitar free permanente"}
                            </button>
                          </form>

                          <form
                            action={extendTenantTrialAction}
                            className="flex gap-2"
                          >
                            <input
                              type="hidden"
                              name="tenant_id"
                              value={tenant.id}
                            />
                            <input
                              type="number"
                              name="days"
                              min={1}
                              max={365}
                              defaultValue={7}
                              className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-0 transition focus:border-primary"
                            />
                            <button
                              type="submit"
                              disabled={tenant.is_permanent_free_plan}
                              className="flex-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Dar dias de trial
                            </button>
                          </form>
                          <p className="text-[11px] leading-5 text-muted">
                            Última extensão manual:{" "}
                            {formatDateTime(tenant.trial_last_extended_at)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface-card p-5">
          <h2 className="text-lg font-semibold text-secondary">
            Métricas do negócio
          </h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Base total
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {tenants.length} tenant(s)
              </p>
              <p className="mt-1 text-muted">
                {users.length} profissionais e {totalPatients} pacientes em
                contagem agregada.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Atividade do mês
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {appointmentsThisMonth} consultas
              </p>
              <p className="mt-1 text-muted">
                {completedThisMonth} concluídas no período atual.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Atenção comercial
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {pastDueTenants + trialsEndingSoon}
              </p>
              <p className="mt-1 text-muted">
                contas exigindo ação entre atraso e trials próximos do fim.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
