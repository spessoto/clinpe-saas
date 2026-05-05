import { AlertCircle, CheckCircle2 } from "lucide-react";

import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveTrialEnd } from "@/lib/tenant-access";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  error?: string;
  days?: string;
}>;

type ClientRow = {
  id: string;
  trial_ends_at: string;
  trial_extension_days: number;
  is_permanent_free_plan: boolean;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_expires_at: string | null;
};

const TENANTS_PAGE_SIZE = 1000;
const TENANT_IN_BATCH_SIZE = 500;

async function fetchAllTenantsForKpis() {
  const adminClient = createAdminClient();
  const tenants: ClientRow[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * TENANTS_PAGE_SIZE;
    const to = from + TENANTS_PAGE_SIZE - 1;

    const { data, error } = await adminClient
      .from("tenants")
      .select(
        "id, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, subscription_expires_at",
      )
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Falha ao carregar tenants para KPIs: ${error.message}`);
    }

    const chunk = (data ?? []) as ClientRow[];
    tenants.push(...chunk);

    if (chunk.length < TENANTS_PAGE_SIZE) {
      break;
    }
  }

  return tenants;
}

async function countRowsByActiveTenants(input: {
  table: "patients" | "appointments";
  tenantIds: string[];
  monthStartIso?: string;
  monthEndIso?: string;
  status?: "completed";
  excludeCanceled?: boolean;
}) {
  if (input.tenantIds.length === 0) {
    return 0;
  }

  const adminClient = createAdminClient();
  let total = 0;

  for (let i = 0; i < input.tenantIds.length; i += TENANT_IN_BATCH_SIZE) {
    const batchIds = input.tenantIds.slice(i, i + TENANT_IN_BATCH_SIZE);

    let query = adminClient
      .from(input.table)
      .select("id", { count: "exact", head: true })
      .in("tenant_id", batchIds);

    if (input.table === "appointments") {
      if (input.excludeCanceled) {
        query = query.neq("status", "canceled");
      }

      if (input.status) {
        query = query.eq("status", input.status);
      }

      if (input.monthStartIso && input.monthEndIso) {
        query = query
          .gte("scheduled_at", input.monthStartIso)
          .lt("scheduled_at", input.monthEndIso);
      }
    }

    const result = await query;
    if (result.error) {
      throw new Error(
        `Falha ao contar ${input.table} por tenant ativo: ${result.error.message}`,
      );
    }

    total += result.count ?? 0;
  }

  return total;
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

  const [clients, usersCountResult, adminTenantsResult] = await Promise.all([
    fetchAllTenantsForKpis(),
    adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", false),
    adminClient.from("users").select("tenant_id").eq("is_admin", true),
  ]);

  if (usersCountResult.error) {
    throw new Error(
      `Falha ao contar usuários: ${usersCountResult.error.message}`,
    );
  }

  const usersCount = usersCountResult.count ?? 0;

  // Tenants que pertencem a usuários admin — excluídos de "clientes ativos"
  const adminTenantIds = new Set(
    (adminTenantsResult.data ?? [])
      .map((u) => u.tenant_id)
      .filter(Boolean) as string[],
  );

  // Clientes ativos = tiveram pelo menos 1 agendamento ou 1 paciente criado nos últimos 15 dias
  // e não pertencem a usuários admin
  const last15Days = new Date(now);
  last15Days.setDate(last15Days.getDate() - 15);
  const last15DaysIso = last15Days.toISOString();

  const allTenantIds = clients
    .map((c) => c.id)
    .filter((id) => !adminTenantIds.has(id));
  const activeTenantsSet = new Set<string>();

  for (let i = 0; i < allTenantIds.length; i += TENANT_IN_BATCH_SIZE) {
    const batch = allTenantIds.slice(i, i + TENANT_IN_BATCH_SIZE);

    const [apptResult, patientResult] = await Promise.all([
      adminClient
        .from("appointments")
        .select("tenant_id")
        .in("tenant_id", batch)
        .gte("created_at", last15DaysIso),
      adminClient
        .from("patients")
        .select("tenant_id")
        .in("tenant_id", batch)
        .gte("created_at", last15DaysIso),
    ]);

    for (const row of apptResult.data ?? [])
      activeTenantsSet.add(row.tenant_id);
    for (const row of patientResult.data ?? [])
      activeTenantsSet.add(row.tenant_id);
  }

  const activeTenantIds = [...activeTenantsSet];

  // UTC-safe month boundaries — avoids off-by-one when server timezone ≠ database UTC
  const utcMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const utcMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [totalPatients, appointmentsThisMonth, completedThisMonth] =
    await Promise.all([
      countRowsByActiveTenants({
        table: "patients",
        tenantIds: activeTenantIds,
      }),
      countRowsByActiveTenants({
        table: "appointments",
        tenantIds: activeTenantIds,
        monthStartIso: utcMonthStart.toISOString(),
        monthEndIso: utcMonthEnd.toISOString(),
        excludeCanceled: true,
      }),
      countRowsByActiveTenants({
        table: "appointments",
        tenantIds: activeTenantIds,
        monthStartIso: utcMonthStart.toISOString(),
        monthEndIso: utcMonthEnd.toISOString(),
        status: "completed",
      }),
    ]);

  const totalClients = clients.length;
  const activeClients = activeTenantIds.length;
  const permanentFreeClients = clients.filter(
    (client) => client.is_permanent_free_plan,
  ).length;
  const clientsPastDue = clients.filter(
    (client) =>
      client.subscription_status === "past_due" &&
      !client.is_permanent_free_plan,
  ).length;
  const trialsEndingSoon = clients.filter((client) => {
    if (
      client.is_permanent_free_plan ||
      client.subscription_status !== "trialing"
    ) {
      return false;
    }

    const effectiveTrialEnd = getEffectiveTrialEnd(client);
    return effectiveTrialEnd >= now && effectiveTrialEnd <= next7Days;
  }).length;
  // Only count tenants with active subscriptions (not trials) expiring in 30 days
  const renewalsNext30Days = clients.filter((client) => {
    if (
      !client.subscription_expires_at ||
      client.is_permanent_free_plan ||
      client.subscription_status !== "active"
    ) {
      return false;
    }

    const renewalDate = new Date(client.subscription_expires_at);
    return renewalDate >= now && renewalDate <= next30Days;
  }).length;
  const cards = [
    {
      title: "Clientes cadastrados",
      value: totalClients,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      title: "Clientes ativos",
      value: activeClients,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Clientes free permanente",
      value: permanentFreeClients,
      tone: "bg-success/10 text-success",
    },
    {
      title: "Trials vencendo em 14 dias",
      value: trialsEndingSoon,
      tone: "bg-warning/10 text-warning",
    },
    {
      title: "Renovações em 30 dias",
      value: renewalsNext30Days,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      title: "Clientes em atraso",
      value: clientsPastDue,
      tone: "bg-destructive/10 text-destructive",
    },
    {
      title: "Profissionais cadastrados",
      value: usersCount,
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
        return "O cliente já estava configurado com free permanente.";
      case "trial-extended":
        return `Trial estendido com sucesso em ${params.days ?? "0"} dia(s).`;
      default:
        return null;
    }
  })();

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
        Painel geral
      </h1>

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
    </section>
  );
}
