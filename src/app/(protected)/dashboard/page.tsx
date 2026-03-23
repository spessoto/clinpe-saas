import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function monthBoundaries() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startDate,
    endDate,
  };
}

function slugifyProfessionalName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function DashboardPage() {
  const { appUser } = await requireActiveTenant();
  const professionalSlug = slugifyProfessionalName(appUser.full_name);
  const bookingPath = professionalSlug ? `/${professionalSlug}` : null;
  const supabase = await createClient();
  const { start, end, startDate, endDate } = monthBoundaries();

  const [
    appointmentsResult,
    patientsResult,
    materialsResult,
    financialResult,
    pendingBiologicalTestsResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", appUser.tenant_id)
      .neq("status", "canceled")
      .gte("scheduled_at", start)
      .lt("scheduled_at", end),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", appUser.tenant_id),
    supabase
      .from("materials")
      .select("id, quantity, minimum_stock")
      .eq("tenant_id", appUser.tenant_id),
    supabase
      .from("financial_transactions")
      .select("type, amount")
      .eq("tenant_id", appUser.tenant_id)
      .gte("occurred_on", startDate)
      .lt("occurred_on", endDate),
    supabase
      .from("sterilization_biological_tests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", appUser.tenant_id)
      .eq("status", "pending"),
  ]);

  const lowStockCount =
    materialsResult.data?.filter((m) => m.quantity <= m.minimum_stock).length ??
    0;

  const financialTotals = (financialResult.data ?? []).reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount ?? 0);

      if (transaction.type === "income") {
        acc.income += amount;
      }

      if (transaction.type === "expense") {
        acc.expense += amount;
      }

      return acc;
    },
    { income: 0, expense: 0 },
  );

  const monthlyBalance = financialTotals.income - financialTotals.expense;
  const formattedMonthlyBalance = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(monthlyBalance);

  const pendingBiologicalTests = pendingBiologicalTestsResult.count ?? 0;

  const cards = [
    {
      title: "Consultas do mês",
      value: appointmentsResult.count ?? 0,
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Pacientes ativos",
      value: patientsResult.count ?? 0,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      title: "Materiais em baixa",
      value: lowStockCount,
      tone: "bg-warning/10 text-warning",
    },
    {
      title: "Saldo do mês",
      value: formattedMonthlyBalance,
      tone:
        monthlyBalance >= 0
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="mt-1 text-muted">Visão geral operacional da clínica.</p>
        </div>

        <Link href="/patients/new" className="btn-gradient">
          Novo paciente
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">
            Agenda online
          </h3>
          <p className="mt-2 text-sm text-muted">
            Sua agenda pública funciona com os horários configurados no sistema
            e consultas registradas internamente.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Ajustar horários
          </Link>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">
            Autoagendamento
          </h3>
          <p className="mt-2 text-sm text-muted">
            {bookingPath
              ? `Link público da clínica: ${bookingPath}`
              : "Slug do tenant ainda não configurado. Execute a migration do Épico 4."}
          </p>
          {bookingPath ? (
            <Link
              href={bookingPath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Abrir página pública
            </Link>
          ) : null}
        </article>
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">POPs</h3>
          <p className="mt-2 text-sm text-muted">
            Visualize templates base com substituição automática de nome e
            registro.
          </p>
          <Link
            href="/pop-documents"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir documentos
          </Link>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">Financeiro</h3>
          <p className="mt-2 text-sm text-muted">
            Registre entradas e saídas e acompanhe o saldo operacional do mês.
          </p>
          <Link
            href="/finance"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir financeiro
          </Link>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">
            Pacientes para retorno
          </h3>
          <p className="mt-2 text-sm text-muted">
            Acesse a régua de recall para pacientes com última consulta há mais
            de 30 dias.
          </p>
          <Link
            href="/patients/recall"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir régua de recall
          </Link>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">
            Central de esterilização
          </h3>
          <p className="mt-2 text-sm text-muted">
            {pendingBiologicalTests > 0
              ? `Você tem ${pendingBiologicalTests} teste(s) biológico(s) aguardando leitura.`
              : "Sem testes biológicos pendentes no momento."}
          </p>
          <Link
            href="/sterilization"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir central
          </Link>
        </article>
      </div>
    </section>
  );
}
