import { createSterilizationLogAction } from "@/app/(protected)/sterilization/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function SterilizationPage({ searchParams }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;

  const { data: logs } = await supabase
    .from("sterilization_logs")
    .select(
      "id, material_name, method, cycle_code, responsible_name, sterilized_at, expires_at, notes, created_at",
    )
    .eq("tenant_id", appUser.tenant_id)
    .order("sterilized_at", { ascending: false })
    .limit(50);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Esterilização</h2>
        <p className="mt-1 text-muted">
          Rastreie os ciclos de esterilização para manter controle operacional e
          de conformidade.
        </p>
      </div>

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">Novo registro</h3>

        {success ? (
          <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form action={createSterilizationLogAction} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Material</span>
              <input
                name="material_name"
                required
                placeholder="Ex.: Kit clínico, alicate"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Data e hora da esterilização
              </span>
              <input
                type="datetime-local"
                name="sterilized_at"
                required
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Método</span>
              <input
                name="method"
                placeholder="Ex.: Autoclave"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Código do ciclo
              </span>
              <input
                name="cycle_code"
                placeholder="Ex.: AC-2026-0319"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Responsável</span>
              <input
                name="responsible_name"
                placeholder="Nome do profissional"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Validade</span>
              <input
                type="date"
                name="expires_at"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">Observações</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Informações adicionais do ciclo"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div>
            <button type="submit" className="btn-gradient">
              Salvar registro
            </button>
          </div>
        </form>
      </article>

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Últimos ciclos registrados
          </h3>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Esterilizado em</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Validade</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-foreground">
                  {log.material_name}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDateTime(log.sterilized_at)}
                </td>
                <td className="px-4 py-3 text-muted">{log.method ?? "-"}</td>
                <td className="px-4 py-3 text-muted">
                  {log.cycle_code ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {log.responsible_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {log.expires_at
                    ? new Date(`${log.expires_at}T00:00:00`).toLocaleDateString(
                        "pt-BR",
                      )
                    : "-"}
                </td>
              </tr>
            ))}

            {(logs ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={6}>
                  Nenhum ciclo de esterilização registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </section>
  );
}
