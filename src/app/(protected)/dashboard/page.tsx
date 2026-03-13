import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function monthBoundaries() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function DashboardPage() {
  const { appUser, tenant } = await requireActiveTenant();
  const bookingPath = tenant.slug ? `/${tenant.slug}/book` : null;
  const supabase = await createClient();
  const { start, end } = monthBoundaries();

  const appointmentsResult = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id)
    .gte("scheduled_at", start)
    .lt("scheduled_at", end);

  const patientsResult = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id);

  const materialsResult = await supabase
    .from("materials")
    .select("id, quantity, minimum_stock")
    .eq("tenant_id", appUser.tenant_id);

  const lowStockCount =
    materialsResult.data?.filter((m) => m.quantity <= m.minimum_stock).length ??
    0;

  const cards = [
    {
      title: "Consultas do mes",
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
  ];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-secondary">Dashboard</h2>
          <p className="mt-1 text-muted">Visao geral operacional da clinica.</p>
        </div>

        <Link
          href="/patients/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Novo paciente
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm"
          >
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
        <article className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">
            Google Calendar
          </h3>
          <p className="mt-2 text-sm text-muted">
            Conecte sua agenda para sincronizar disponibilidade e consultas.
          </p>
          <Link
            href="/integrations/google"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir integracao
          </Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">
            Autoagendamento
          </h3>
          <p className="mt-2 text-sm text-muted">
            {bookingPath
              ? `Link publico da clinica: ${bookingPath}`
              : "Slug do tenant ainda nao configurado. Execute a migration do Epico 4."}
          </p>
          {bookingPath ? (
            <Link
              href={bookingPath}
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Abrir pagina publica
            </Link>
          ) : null}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">POPs</h3>
          <p className="mt-2 text-sm text-muted">
            Visualize templates base com substituicao automatica de nome e
            registro.
          </p>
          <Link
            href="/pop-documents"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Abrir documentos
          </Link>
        </article>
      </div>
    </section>
  );
}
