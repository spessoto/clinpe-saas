import { requirePlanCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SterilizationReportPrintButton } from "@/app/(protected)/sterilization/report/print-button";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function indicatorLabel(status: string) {
  if (status === "approved") {
    return "Aprovado";
  }

  if (status === "rejected") {
    return "Reprovado";
  }

  return "Não aferido";
}

function indicatorPillClass(status: string) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-200 text-slate-700";
}

function biologicalTestLabel(status: string) {
  if (status === "approved") {
    return "Aprovado";
  }

  if (status === "rejected") {
    return "Reprovado";
  }

  return "Pendente";
}

function splitCycleMaterials(materialName: string) {
  return materialName
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function SterilizationReportPage({ searchParams }: Props) {
  const { appUser, tenant } = await requirePlanCapability(
    "sterilization",
    "O módulo de Esterilização está disponível apenas nos planos Pro e Clínica.",
  );
  const supabase = await createClient();
  const params = await searchParams;

  const monthParam =
    typeof params.month === "string" ? params.month : undefined;
  const { monthKey, startIso, endIso } = getMonthBounds(monthParam);

  const [cyclesResult, testsResult] = await Promise.all([
    supabase
      .from("sterilization_logs")
      .select(
        "id, batch_number, material_name, sterilized_at, temperature_celsius, pressure_bar, chemical_indicator_status",
      )
      .eq("tenant_id", appUser.tenant_id)
      .gte("sterilized_at", startIso)
      .lt("sterilized_at", endIso)
      .order("sterilized_at", { ascending: false }),
    supabase
      .from("sterilization_biological_tests")
      .select(
        "id, sterilization_log_id, ampoule_lot, incubation_started_at, read_at, status",
      )
      .eq("tenant_id", appUser.tenant_id)
      .order("incubation_started_at", { ascending: false }),
  ]);

  const { data: tenantBranding } = await supabase
    .from("tenants")
    .select("name, logo_url, cpf_cnpj")
    .eq("id", tenant.id)
    .maybeSingle();

  const cycles = cyclesResult.data ?? [];
  const tests = testsResult.data ?? [];
  const clinicName = tenantBranding?.name ?? tenant.name;
  const clinicLogoUrl = tenantBranding?.logo_url ?? tenant.logo_url;
  const clinicDocument = tenantBranding?.cpf_cnpj ?? tenant.cpf_cnpj ?? "-";

  const testsByCycle = new Map<string, typeof tests>();
  for (const test of tests) {
    const list = testsByCycle.get(test.sterilization_log_id) ?? [];
    list.push(test);
    testsByCycle.set(test.sterilization_log_id, list);
  }

  const reportRows = cycles.flatMap((cycle) => {
    const materials = splitCycleMaterials(cycle.material_name);
    if (materials.length === 0) {
      return [{ cycle, material: cycle.material_name }];
    }

    return materials.map((material) => ({ cycle, material }));
  });

  const approvedCycles = cycles.filter(
    (cycle) => cycle.chemical_indicator_status === "approved",
  ).length;
  const rejectedCycles = cycles.filter(
    (cycle) => cycle.chemical_indicator_status === "rejected",
  ).length;
  const notMeasuredCycles = cycles.filter(
    (cycle) => cycle.chemical_indicator_status === "not_measured",
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 bg-slate-50 p-4 text-slate-800 print:bg-white print:p-0 sm:p-6">
      <header
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#0F5AA5] to-[#0D9488] px-5 py-4 text-white print:bg-[#0F5AA5]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Relatório de fiscalização
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Livro de Registros de Esterilização
            </h1>
          </div>
          {clinicLogoUrl ? (
            <img
              src={clinicLogoUrl}
              alt={`Logotipo da clínica ${clinicName}`}
              className="h-14 w-auto max-w-[180px] rounded-md bg-white/90 p-1 object-contain"
            />
          ) : null}
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Clínica
            </p>
            <p className="text-sm font-semibold text-slate-800">{clinicName}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              CPF/CNPJ
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {clinicDocument}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Período
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {monthLabel(monthKey)}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Linhas no relatório
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {reportRows.length}
            </p>
          </article>
        </div>
      </header>

      <div className="print:hidden">
        <SterilizationReportPrintButton />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Ciclos no período
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0F5AA5]">
            {cycles.length}
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-emerald-700">
            Indicador aprovado
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {approvedCycles}
          </p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-rose-700">
            Indicador reprovado
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {rejectedCycles}
          </p>
        </article>
        <article className="rounded-xl border border-slate-300 bg-slate-100 p-4 shadow-sm print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-slate-700">
            Indicador não aferido
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-700">
            {notMeasuredCycles}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F5AA5]/10 text-[#0F5AA5]">
            <tr>
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Temperatura</th>
              <th className="px-4 py-3">Pressão</th>
              <th className="px-4 py-3">Indicador químico</th>
              <th className="px-4 py-3">Teste biológico</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map(({ cycle, material }, index) => {
              const testList = testsByCycle.get(cycle.id) ?? [];
              const lastTest = testList[0] ?? null;

              return (
                <tr
                  key={`${cycle.id}-${index}`}
                  className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {formatDateTime(cycle.sterilized_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {cycle.batch_number}
                  </td>
                  <td className="px-4 py-3">{material}</td>
                  <td className="px-4 py-3">
                    {cycle.temperature_celsius ?? "-"} °C
                  </td>
                  <td className="px-4 py-3">{cycle.pressure_bar ?? "-"} bar</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${indicatorPillClass(cycle.chemical_indicator_status)}`}
                    >
                      {indicatorLabel(cycle.chemical_indicator_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lastTest
                      ? `${biologicalTestLabel(lastTest.status)} (ampola ${lastTest.ampoule_lot})`
                      : "Sem teste"}
                  </td>
                </tr>
              );
            })}

            {reportRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-600" colSpan={7}>
                  Nenhum registro de esterilização no período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
