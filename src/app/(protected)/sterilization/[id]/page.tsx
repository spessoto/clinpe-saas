import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function SterilizationCycleDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const [cycleResult, testsResult] = await Promise.all([
    supabase
      .from("sterilization_logs")
      .select(
        "id, batch_number, material_name, temperature_celsius, pressure_bar, chemical_indicator_status, sterilized_at, notes",
      )
      .eq("id", id)
      .eq("tenant_id", appUser.tenant_id)
      .single(),
    supabase
      .from("sterilization_biological_tests")
      .select(
        "id, ampoule_lot, incubation_started_at, read_at, status, result_notes",
      )
      .eq("tenant_id", appUser.tenant_id)
      .eq("sterilization_log_id", id)
      .order("incubation_started_at", { ascending: false }),
  ]);

  const cycle = cycleResult.data;
  const tests = testsResult.data ?? [];

  if (!cycle) {
    notFound();
  }

  const latestTest = tests[0] ?? null;
  const hasRejectedTest = tests.some((test) => test.status === "rejected");
  const isUsable =
    cycle.chemical_indicator_status === "approved" && !hasRejectedTest;

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <h2 className="text-2xl font-bold">Lote {cycle.batch_number}</h2>
        <p className="mt-1 text-sm text-muted">
          Prova de rastreabilidade para auditoria clínica e sanitária.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-muted">Material</p>
            <p className="font-semibold text-foreground">
              {cycle.material_name}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-muted">Data/Hora do ciclo</p>
            <p className="font-semibold text-foreground">
              {formatDateTime(cycle.sterilized_at)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-muted">Temperatura</p>
            <p className="font-semibold text-foreground">
              {cycle.temperature_celsius ?? "-"} °C
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-muted">Pressão</p>
            <p className="font-semibold text-foreground">
              {cycle.pressure_bar ?? "-"} bar
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm md:col-span-2">
            <p className="text-muted">Indicador químico</p>
            <p
              className={`font-semibold ${
                cycle.chemical_indicator_status === "approved"
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              {cycle.chemical_indicator_status === "approved"
                ? "Aprovado"
                : "Reprovado"}
            </p>
          </div>
        </div>
      </article>

      <article
        className={`rounded-xl border p-4 ${
          isUsable
            ? "border-success/30 bg-success/5"
            : "border-destructive/30 bg-destructive/5"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            isUsable ? "text-success" : "text-destructive"
          }`}
        >
          {isUsable
            ? "Lote liberado para uso: indicador químico aprovado e sem teste biológico reprovado."
            : "Lote NÃO liberado para uso clínico: há reprovação química/biológica associada."}
        </p>
      </article>

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Histórico de testes biológicos
          </h3>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Ampola</th>
              <th className="px-4 py-3">Início incubação</th>
              <th className="px-4 py-3">Leitura</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-muted">{test.ampoule_lot}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDateTime(test.incubation_started_at)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {test.read_at ? formatDateTime(test.read_at) : "Pendente"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      test.status === "approved"
                        ? "bg-success/10 text-success"
                        : test.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                    }`}
                  >
                    {test.status === "approved"
                      ? "Aprovado"
                      : test.status === "rejected"
                        ? "Reprovado"
                        : "Pendente"}
                  </span>
                </td>
              </tr>
            ))}

            {tests.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  Nenhum teste biológico vinculado a este lote.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>

      {latestTest?.status === "rejected" ? (
        <article className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Resultado mais recente reprovado: evidência de falha de
            esterilização.
          </p>
        </article>
      ) : null}

      <Link href="/sterilization" className="btn-outline-modern">
        Voltar para central de esterilização
      </Link>
    </section>
  );
}
