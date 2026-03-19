import { requireActiveTenant } from "@/lib/auth";
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

export default async function SterilizationReportPage({ searchParams }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
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

  const cycles = cyclesResult.data ?? [];
  const tests = testsResult.data ?? [];

  const testsByCycle = new Map<string, typeof tests>();
  for (const test of tests) {
    const list = testsByCycle.get(test.sterilization_log_id) ?? [];
    list.push(test);
    testsByCycle.set(test.sterilization_log_id, list);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 print:p-0">
      <header className="border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold">
          Livro de Registros de Esterilização
        </h1>
        <p className="mt-1 text-sm text-slate-600">Clínica: {tenant.name}</p>
        <p className="text-sm text-slate-600">
          Período: {monthLabel(monthKey)}
        </p>
      </header>

      <div className="print:hidden">
        <SterilizationReportPrintButton />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
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
            {cycles.map((cycle) => {
              const testList = testsByCycle.get(cycle.id) ?? [];
              const lastTest = testList[0] ?? null;

              return (
                <tr
                  key={cycle.id}
                  className="border-t border-slate-200 align-top"
                >
                  <td className="px-4 py-3">
                    {formatDateTime(cycle.sterilized_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {cycle.batch_number}
                  </td>
                  <td className="px-4 py-3">{cycle.material_name}</td>
                  <td className="px-4 py-3">
                    {cycle.temperature_celsius ?? "-"} °C
                  </td>
                  <td className="px-4 py-3">{cycle.pressure_bar ?? "-"} bar</td>
                  <td className="px-4 py-3">
                    {cycle.chemical_indicator_status === "approved"
                      ? "Aprovado"
                      : "Reprovado"}
                  </td>
                  <td className="px-4 py-3">
                    {lastTest
                      ? `${lastTest.status.toUpperCase()} (ampola ${lastTest.ampoule_lot})`
                      : "Sem teste"}
                  </td>
                </tr>
              );
            })}

            {cycles.length === 0 ? (
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
