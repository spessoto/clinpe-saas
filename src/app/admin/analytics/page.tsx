import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasTenantAccess } from "@/lib/tenant-access";
import {
  AnalyticsCharts,
  type MonthlyDataPoint,
  type PlanDistribution,
  type PeriodDistribution,
  type SummaryCards,
} from "./analytics-charts";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

type TenantRow = {
  id: string;
  created_at: string;
  billing_tier: "free_trial" | "tier_1" | "tier_2" | "tier_3" | null;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_period: "monthly" | "annual" | null;
  subscription_expires_at: string | null;
  trial_ends_at: string;
  trial_extension_days: number | null;
  is_permanent_free_plan: boolean;
};

type UserRow = { id: string; created_at: string };

type AppointmentRow = { scheduled_at: string; status: string };

type PricingRow = {
  tier: string;
  monthly_amount: number;
  annual_amount: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthLabels(months: number): string[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1),
    );
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function labelFromKey(key: string) {
  const [year, month] = key.split("-");
  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${monthNames[Number(month) - 1]}/${year?.slice(2)}`;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchAnalyticsData() {
  await requireAdminAccess();

  const adminClient = createAdminClient();
  const MONTHS = 12;
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1),
  );

  // Fetch all data in parallel
  const [tenantsResult, usersResult, appointmentsResult, pricingResult] =
    await Promise.all([
      // All tenants (no date filter — we need all-time for aggregation)
      adminClient
        .from("tenants")
        .select(
          "id, created_at, billing_tier, subscription_status, subscription_period, subscription_expires_at, trial_ends_at, trial_extension_days, is_permanent_free_plan",
        )
        .order("created_at", { ascending: true }),

      // Non-admin users in the period
      adminClient
        .from("users")
        .select("id, created_at")
        .eq("is_admin", false)
        .gte("created_at", periodStart.toISOString()),

      // Appointments in the period
      adminClient
        .from("appointments")
        .select("scheduled_at, status")
        .gte("scheduled_at", periodStart.toISOString()),

      // Pricing reference
      adminClient
        .from("billing_plan_prices")
        .select("tier, monthly_amount, annual_amount"),
    ]);

  const tenants = (tenantsResult.data ?? []) as TenantRow[];
  const users = (usersResult.data ?? []) as UserRow[];
  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];
  const pricing = (pricingResult.data ?? []) as PricingRow[];

  const monthLabels = buildMonthLabels(MONTHS);

  // ── Price lookup map ────────────────────────────────────────────────────────
  const priceMap = new Map<string, { monthly: number; annual: number }>();
  for (const p of pricing) {
    priceMap.set(p.tier, {
      monthly: Number(p.monthly_amount),
      annual: Number(p.annual_amount),
    });
  }

  function getMonthlyEquivalentPrice(tenant: TenantRow): number {
    if (tenant.billing_tier === "free_trial" || !tenant.billing_tier) return 0;
    const prices = priceMap.get(tenant.billing_tier);
    if (!prices) return 0;
    if (tenant.subscription_period === "annual") {
      return prices.annual / 12;
    }
    return prices.monthly;
  }

  // ── Per-month aggregation ───────────────────────────────────────────────────

  // New professional signups per month
  const signupsByMonth = new Map<string, number>();
  for (const u of users) {
    const k = monthKey(u.created_at);
    if (monthLabels.includes(k)) {
      signupsByMonth.set(k, (signupsByMonth.get(k) ?? 0) + 1);
    }
  }

  // Tenant (clinic) signups per month (all time, also for conversion calc)
  const tenantSignupsByMonth = new Map<string, number>();
  const subscribedByMonth = new Map<string, number>();
  for (const t of tenants) {
    const k = monthKey(t.created_at);
    tenantSignupsByMonth.set(k, (tenantSignupsByMonth.get(k) ?? 0) + 1);
    if (
      t.subscription_status === "active" ||
      (t.billing_tier && t.billing_tier !== "free_trial")
    ) {
      subscribedByMonth.set(k, (subscribedByMonth.get(k) ?? 0) + 1);
    }
  }

  // Appointments per month
  const appointmentsByMonth = new Map<string, number>();
  const completedByMonth = new Map<string, number>();
  const canceledByMonth = new Map<string, number>();
  for (const a of appointments) {
    const k = monthKey(a.scheduled_at);
    if (monthLabels.includes(k)) {
      appointmentsByMonth.set(k, (appointmentsByMonth.get(k) ?? 0) + 1);
      if (a.status === "completed") {
        completedByMonth.set(k, (completedByMonth.get(k) ?? 0) + 1);
      }
      if (a.status === "canceled") {
        canceledByMonth.set(k, (canceledByMonth.get(k) ?? 0) + 1);
      }
    }
  }

  // Estimated revenue: active tenants at month-end × their tier price
  // For each month, count active tenants whose subscription_expires_at >= end-of-month
  // and subscription_status = 'active'. For past months we do a best-effort proxy:
  // tenant was created before month end AND (still active now OR was active then).
  const revenueByMonth = new Map<string, number>();
  for (const k of monthLabels) {
    const [yearStr, monthStr] = k.split("-");
    const monthEndDate = new Date(
      Date.UTC(Number(yearStr), Number(monthStr), 1),
    ); // First day of next month = end boundary
    let monthRevenue = 0;
    for (const t of tenants) {
      // Tenant must have existed before end of month
      if (new Date(t.created_at) >= monthEndDate) continue;
      // Active subscription: status=active and not expired by month end
      if (t.subscription_status === "active") {
        if (
          !t.subscription_expires_at ||
          new Date(t.subscription_expires_at) >= monthEndDate
        ) {
          monthRevenue += getMonthlyEquivalentPrice(t);
        }
      }
    }
    revenueByMonth.set(k, Math.round(monthRevenue * 100) / 100);
  }

  // Churn proxy: tenants whose subscription_expires_at fell within the month
  // AND subscription_status = past_due (i.e., they churned that month)
  const churnByMonth = new Map<string, number>();
  for (const t of tenants) {
    if (t.subscription_status !== "past_due" || !t.subscription_expires_at) {
      continue;
    }
    const k = monthKey(t.subscription_expires_at);
    if (monthLabels.includes(k)) {
      churnByMonth.set(k, (churnByMonth.get(k) ?? 0) + 1);
    }
  }

  // ── Build unified monthly data points ──────────────────────────────────────
  const monthlyData: MonthlyDataPoint[] = monthLabels.map((k) => ({
    month: labelFromKey(k),
    signups: signupsByMonth.get(k) ?? 0,
    appointments: appointmentsByMonth.get(k) ?? 0,
    completed: completedByMonth.get(k) ?? 0,
    canceled: canceledByMonth.get(k) ?? 0,
    revenue: revenueByMonth.get(k) ?? 0,
    trialsStarted: tenantSignupsByMonth.get(k) ?? 0,
    subscriptions: subscribedByMonth.get(k) ?? 0,
    churn: churnByMonth.get(k) ?? 0,
  }));

  // ── Plan distribution (current snapshot) ─────────────────────────────────
  const planCounts = { trial: 0, tier_1: 0, tier_2: 0, tier_3: 0, free: 0 };
  for (const t of tenants) {
    if (!hasTenantAccess(t)) continue;
    if (t.is_permanent_free_plan) {
      planCounts.free += 1;
    } else if (t.billing_tier === "tier_1") {
      planCounts.tier_1 += 1;
    } else if (t.billing_tier === "tier_2") {
      planCounts.tier_2 += 1;
    } else if (t.billing_tier === "tier_3") {
      planCounts.tier_3 += 1;
    } else {
      planCounts.trial += 1;
    }
  }
  const planDistribution: PlanDistribution[] = [
    { name: "Trial", value: planCounts.trial, color: "#64748B" },
    { name: "Starter", value: planCounts.tier_1, color: "#0D9488" },
    { name: "Pro", value: planCounts.tier_2, color: "#1E3A8A" },
    { name: "Clínica", value: planCounts.tier_3, color: "#7C3AED" },
    { name: "Free", value: planCounts.free, color: "#10B981" },
  ].filter((p) => p.value > 0);

  // ── Period distribution (monthly vs annual) ────────────────────────────────
  const periodCounts = { monthly: 0, annual: 0, unknown: 0 };
  for (const t of tenants) {
    if (t.subscription_status !== "active") continue;
    if (!hasTenantAccess(t)) continue;
    if (t.subscription_period === "monthly") periodCounts.monthly += 1;
    else if (t.subscription_period === "annual") periodCounts.annual += 1;
    else periodCounts.unknown += 1;
  }
  const periodDistribution: PeriodDistribution[] = [
    { name: "Mensal", value: periodCounts.monthly, color: "#0D9488" },
    { name: "Anual", value: periodCounts.annual, color: "#1E3A8A" },
    ...(periodCounts.unknown > 0
      ? [
          {
            name: "Não informado",
            value: periodCounts.unknown,
            color: "#94A3B8",
          },
        ]
      : []),
  ].filter((p) => p.value > 0);

  // ── Summary cards ──────────────────────────────────────────────────────────
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const currentRevenue = revenueByMonth.get(currentMonthKey) ?? 0;

  // MRR: sum of monthly equivalent for all currently active tenants
  let mrr = 0;
  for (const t of tenants) {
    if (t.subscription_status === "active" && hasTenantAccess(t)) {
      mrr += getMonthlyEquivalentPrice(t);
    }
  }
  mrr = Math.round(mrr * 100) / 100;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => hasTenantAccess(t)).length;
  const paidTenants = tenants.filter(
    (t) => t.subscription_status === "active" && hasTenantAccess(t),
  ).length;
  const conversionRate =
    totalTenants > 0 ? Math.round((paidTenants / totalTenants) * 100) : 0;

  // Total appointments (current month, non-canceled)
  const currentMonthAppointments =
    appointmentsByMonth.get(currentMonthKey) ?? 0;
  const currentMonthCanceled = canceledByMonth.get(currentMonthKey) ?? 0;
  const currentMonthActive = currentMonthAppointments - currentMonthCanceled;

  const summaryCards: SummaryCards = {
    currentRevenue,
    mrr,
    totalTenants,
    activeTenants,
    paidTenants,
    conversionRate,
    currentMonthAppointments: currentMonthActive,
  };

  return { monthlyData, planDistribution, periodDistribution, summaryCards };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  await requireAdminAccess();

  const { monthlyData, planDistribution, periodDistribution, summaryCards } =
    await fetchAnalyticsData();

  return (
    <section>
      <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
        Análises
      </h1>
      <p className="mb-8 text-sm text-muted">
        Histórico de desempenho dos últimos 12 meses. Receita estimada com base
        nos planos ativos (não representa transações reais do Asaas).
      </p>

      <AnalyticsCharts
        monthlyData={monthlyData}
        planDistribution={planDistribution}
        periodDistribution={periodDistribution}
        summaryCards={summaryCards}
      />
    </section>
  );
}
