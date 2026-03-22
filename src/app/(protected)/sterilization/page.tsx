import Link from "next/link";

import {
  createBiologicalTestAction,
  createSterilizationMaterialAction,
  createSterilizationCycleAction,
  updateBiologicalTestResultAction,
} from "@/app/(protected)/sterilization/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MaterialsDialog } from "./materials-dialog";
import { SterilizedMaterialsField } from "./sterilized-materials-field";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type BiologicalTestStatus = "pending" | "approved" | "rejected";

type ChemicalIndicatorStatus = "approved" | "rejected";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function localDateTimeInputValue() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getMonthBounds(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, rawMonth] = month.split("-").map(Number);
    const start = new Date(year, (rawMonth ?? 1) - 1, 1);
    const end = new Date(year, rawMonth ?? 1, 1);
    return {
      monthKey: month,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function statusBadge(status: BiologicalTestStatus) {
  if (status === "approved") {
    return "bg-success/10 text-success";
  }

  if (status === "rejected") {
    return "bg-destructive/10 text-destructive";
  }

  return "bg-warning/10 text-warning";
}

function indicatorBadge(status: ChemicalIndicatorStatus) {
  return status === "approved"
    ? "bg-success/10 text-success"
    : "bg-destructive/10 text-destructive";
}

export default async function SterilizationPage({ searchParams }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const params = await searchParams;

  const monthParam =
    typeof params.month === "string" ? params.month : undefined;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { monthKey, startIso, endIso } = getMonthBounds(monthParam);

  const [cyclesResult, testsResult, materialsResult] = await Promise.all([
    supabase
      .from("sterilization_logs")
      .select(
        "id, batch_number, material_name, temperature_celsius, pressure_bar, chemical_indicator_status, sterilized_at, notes",
      )
      .eq("tenant_id", appUser.tenant_id)
      .gte("sterilized_at", startIso)
      .lt("sterilized_at", endIso)
      .order("sterilized_at", { ascending: false }),
    supabase
      .from("sterilization_biological_tests")
      .select(
        "id, sterilization_log_id, ampoule_lot, incubation_started_at, read_at, status, result_notes, cycle:sterilization_logs(batch_number)",
      )
      .eq("tenant_id", appUser.tenant_id)
      .order("incubation_started_at", { ascending: false })
      .limit(100),
    supabase
      .from("materials")
      .select("id, name")
      .eq("tenant_id", appUser.tenant_id)
      .order("name", { ascending: true }),
  ]);

  const cycles =
    (cyclesResult.data as Array<{
      id: string;
      batch_number: string;
      material_name: string;
      temperature_celsius: number | null;
      pressure_bar: number | null;
      chemical_indicator_status: ChemicalIndicatorStatus;
      sterilized_at: string;
      notes: string | null;
    }> | null) ?? [];

  const tests =
    (testsResult.data as Array<{
      id: string;
      sterilization_log_id: string;
      ampoule_lot: string;
      incubation_started_at: string;
      read_at: string | null;
      status: BiologicalTestStatus;
      result_notes: string | null;
      cycle: { batch_number: string } | { batch_number: string }[] | null;
    }> | null) ?? [];

  const materialNames =
    (materialsResult.data as Array<{ id: string; name: string }> | null)?.map(
      (material) => material.name,
    ) ?? [];

  const pendingTests = tests.filter((test) => test.status === "pending");
  const currentTimeMs = Date.parse(new Date().toISOString());

  const duePendingTests = pendingTests.filter((test) => {
    const ms = new Date(test.incubation_started_at).getTime();
    const hours = (currentTimeMs - ms) / (1000 * 60 * 60);
    return hours >= 24;
  });

  const cycleOptions = cycles.filter(
    (cycle) => cycle.chemical_indicator_status === "approved",
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Central de Esterilização</h2>
          <p className="mt-1 text-muted">
            Diário de bordo da autoclave, testes biológicos e rastreabilidade
            para fiscalização.
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <form
            action="/sterilization"
            method="get"
            className="flex w-full items-center gap-2 sm:w-auto"
          >
            <input
              type="month"
              name="month"
              defaultValue={monthKey}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2 sm:w-auto"
            />
            <button type="submit" className="btn-outline-modern">
              Filtrar
            </button>
          </form>
          <Link
            href={`/sterilization/report?month=${monthKey}`}
            className="btn-outline-modern w-full text-center sm:w-auto"
            target="_blank"
          >
            Exportar PDF (modo fiscalização)
          </Link>
          <MaterialsDialog
            monthKey={monthKey}
            action={createSterilizationMaterialAction}
            existingNames={materialNames}
          />
        </div>
      </div>

      <article className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-semibold text-warning">
          {duePendingTests.length > 0
            ? `Você tem ${duePendingTests.length} teste(s) biológico(s) aguardando leitura há mais de 24h.`
            : pendingTests.length > 0
              ? `Você tem ${pendingTests.length} teste(s) biológico(s) em incubação.`
              : "Nenhum teste biológico pendente no momento."}
        </p>
      </article>

      {success ? (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="surface-card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary">Novo ciclo</h3>
          <p className="mt-1 text-sm text-muted">
            Fase 1: registre cada ciclo diário da autoclave com lote,
            temperatura, pressão e indicador químico.
          </p>

          <form
            action={createSterilizationCycleAction}
            className="mt-4 grid gap-4"
          >
            <input type="hidden" name="month" value={monthKey} />

            <div className="grid gap-4 lg:grid-cols-4">
              <label className="grid gap-1 text-sm lg:col-span-1">
                <span className="font-semibold text-foreground">
                  Data e hora
                </span>
                <input
                  type="datetime-local"
                  name="sterilized_at"
                  required
                  defaultValue={localDateTimeInputValue()}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="grid gap-1 text-sm lg:col-span-2">
                <span className="font-semibold text-foreground">
                  Número do ciclo/lote
                </span>
                <input
                  name="batch_number"
                  required
                  placeholder="Ex.: Lote 1042"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <div className="lg:col-span-1 lg:self-end">
                <SterilizedMaterialsField options={materialNames} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">
                  Temperatura (°C)
                </span>
                <input
                  name="temperature_celsius"
                  required
                  inputMode="decimal"
                  placeholder="134"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">
                  Pressão (bar)
                </span>
                <input
                  name="pressure_bar"
                  required
                  inputMode="decimal"
                  placeholder="1.2"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">
                  Indicador químico
                </span>
                <select
                  name="chemical_indicator_status"
                  required
                  defaultValue="approved"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                >
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Reprovado</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Observações</span>
              <textarea
                name="observations"
                rows={2}
                placeholder="Observações opcionais sobre o ciclo"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <div>
              <button type="submit" className="btn-gradient">
                Salvar ciclo
              </button>
            </div>
          </form>
        </article>

        <article className="surface-card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Registrar teste biológico
          </h3>
          <p className="mt-1 text-sm text-muted">
            Fase 2: selecione o lote testado, informe a ampola e inicie a
            incubação.
          </p>

          <form action={createBiologicalTestAction} className="mt-4 grid gap-4">
            <input type="hidden" name="month" value={monthKey} />

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Lote/Ciclo testado
              </span>
              <select
                name="sterilization_log_id"
                required
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              >
                <option value="">Selecione...</option>
                {cycleOptions.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.batch_number} • {cycle.material_name} •{" "}
                    {formatDateTime(cycle.sterilized_at)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Lote da ampola
              </span>
              <input
                name="ampoule_lot"
                required
                placeholder="Ex.: AMP-22901"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <div>
              <button type="submit" className="btn-gradient">
                Iniciar incubação
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-foreground">
              Leituras pendentes
            </h4>
            {pendingTests.length === 0 ? (
              <p className="text-sm text-muted">Nenhum teste pendente.</p>
            ) : (
              pendingTests.map((test) => {
                const cycle = Array.isArray(test.cycle)
                  ? test.cycle[0]
                  : test.cycle;
                return (
                  <form
                    key={test.id}
                    action={updateBiologicalTestResultAction}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <input type="hidden" name="month" value={monthKey} />
                    <input type="hidden" name="test_id" value={test.id} />
                    <p className="text-sm font-semibold text-foreground">
                      {cycle?.batch_number ?? "Lote não identificado"} • Ampola{" "}
                      {test.ampoule_lot}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Incubação iniciada em{" "}
                      {formatDateTime(test.incubation_started_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        name="result"
                        value="approved"
                        className="rounded-md bg-success px-3 py-1 text-xs font-semibold text-white"
                      >
                        Aprovado (esterilizou)
                      </button>
                      <button
                        type="submit"
                        name="result"
                        value="rejected"
                        className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-white"
                      >
                        Reprovado (falha)
                      </button>
                    </div>
                  </form>
                );
              })
            )}
          </div>
        </article>
      </div>

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Diário de bordo da autoclave - {monthLabel(monthKey)}
          </h3>
        </div>

        <div className="space-y-3 p-4 sm:hidden">
          {cycles.length === 0 ? (
            <p className="rounded-lg border border-slate-100 bg-white px-4 py-6 text-sm text-muted">
              Nenhum ciclo registrado para o período selecionado.
            </p>
          ) : (
            cycles.map((cycle) => (
              <article
                key={cycle.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/sterilization/${cycle.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {cycle.batch_number}
                  </Link>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${indicatorBadge(cycle.chemical_indicator_status)}`}
                  >
                    {cycle.chemical_indicator_status === "approved"
                      ? "Aprovado"
                      : "Reprovado"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{cycle.material_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDateTime(cycle.sterilized_at)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {cycle.temperature_celsius
                    ? `${cycle.temperature_celsius} °C`
                    : "-"}
                  {" • "}
                  {cycle.pressure_bar ? `${cycle.pressure_bar} bar` : "-"}
                </p>
              </article>
            ))
          )}
        </div>

        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Temperatura</th>
              <th className="px-4 py-3">Pressão</th>
              <th className="px-4 py-3">Indicador químico</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-muted">
                  {formatDateTime(cycle.sterilized_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/sterilization/${cycle.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {cycle.batch_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{cycle.material_name}</td>
                <td className="px-4 py-3 text-muted">
                  {cycle.temperature_celsius
                    ? `${cycle.temperature_celsius} °C`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {cycle.pressure_bar ? `${cycle.pressure_bar} bar` : "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${indicatorBadge(cycle.chemical_indicator_status)}`}
                  >
                    {cycle.chemical_indicator_status === "approved"
                      ? "Aprovado"
                      : "Reprovado"}
                  </span>
                </td>
              </tr>
            ))}

            {cycles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={6}>
                  Nenhum ciclo registrado para o período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Histórico de testes biológicos
          </h3>
        </div>

        <div className="space-y-3 p-4 sm:hidden">
          {tests.length === 0 ? (
            <p className="rounded-lg border border-slate-100 bg-white px-4 py-6 text-sm text-muted">
              Nenhum teste biológico registrado ainda.
            </p>
          ) : (
            tests.map((test) => {
              const cycle = Array.isArray(test.cycle)
                ? test.cycle[0]
                : test.cycle;
              return (
                <article
                  key={test.id}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {cycle?.batch_number ?? "-"}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(test.status)}`}
                    >
                      {test.status === "pending"
                        ? "Pendente"
                        : test.status === "approved"
                          ? "Aprovado"
                          : "Reprovado"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Ampola: {test.ampoule_lot}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Início: {formatDateTime(test.incubation_started_at)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Leitura:{" "}
                    {test.read_at ? formatDateTime(test.read_at) : "Pendente"}
                  </p>
                </article>
              );
            })
          )}
        </div>

        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Ampola</th>
              <th className="px-4 py-3">Início incubação</th>
              <th className="px-4 py-3">Leitura</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const cycle = Array.isArray(test.cycle)
                ? test.cycle[0]
                : test.cycle;

              return (
                <tr key={test.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-muted">
                    {cycle?.batch_number ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-muted">{test.ampoule_lot}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(test.incubation_started_at)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {test.read_at ? formatDateTime(test.read_at) : "Pendente"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(test.status)}`}
                    >
                      {test.status === "pending"
                        ? "Pendente"
                        : test.status === "approved"
                          ? "Aprovado"
                          : "Reprovado"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {tests.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  Nenhum teste biológico registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>

      <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-muted">
        <p>
          Clínica: {tenant.name}. No modo fiscalização, exporte o mês e
          apresente os lotes vinculados ao prontuário do paciente.
        </p>
      </article>
    </section>
  );
}
