import Link from "next/link";

import {
  markCommissionPaidAction,
  deleteCommissionAction,
} from "@/app/(protected)/commissions/actions";
import { requireOwnerPlanCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("pt-BR");
}

export default async function CommissionsPage({ searchParams }: Props) {
  const { appUser } = await requireOwnerPlanCapability(
    "commissions",
    "O módulo de Comissões está disponível apenas no plano Clínica.",
  );
  const supabase = await createClient();

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  // Current month bounds
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  const { data: commissions } = await supabase
    .from("commissions")
    .select(
      "id, professional_name, service_description, amount, commission_rate, commission_amount, service_date, paid_at, notes",
    )
    .eq("tenant_id", appUser.tenant_id)
    .gte("service_date", monthStart)
    .lt("service_date", monthEnd)
    .order("service_date", { ascending: false });

  const rows = commissions ?? [];
  const totalCommissions = rows.reduce(
    (acc, r) => acc + Number(r.commission_amount),
    0,
  );
  const paidCommissions = rows
    .filter((r) => r.paid_at)
    .reduce((acc, r) => acc + Number(r.commission_amount), 0);
  const pendingCommissions = totalCommissions - paidCommissions;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Comissões</h2>
          <p className="mt-1 text-sm text-muted">
            Controle de comissões por profissional —{" "}
            {now.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/commissions/new" className="btn-gradient">
          Registrar comissão
        </Link>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total do mês
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatBRL(totalCommissions)}
          </p>
        </article>
        <article className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pago
          </p>
          <p className="mt-1 text-2xl font-bold text-success">
            {formatBRL(paidCommissions)}
          </p>
        </article>
        <article className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pendente
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {formatBRL(pendingCommissions)}
          </p>
        </article>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-100 bg-white px-4 py-6 text-sm text-muted">
            Nenhuma comissão registrada este mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {r.professional_name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.paid_at
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {r.paid_at ? "Pago" : "Pendente"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {r.service_description ?? "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Serviço: {formatBRL(Number(r.amount))}</span>
                  <span>
                    Comissão ({r.commission_rate}%):{" "}
                    <strong>{formatBRL(Number(r.commission_amount))}</strong>
                  </span>
                  <span>Data: {formatDate(r.service_date)}</span>
                </div>
                {!r.paid_at ? (
                  <form action={markCommissionPaidAction} className="mt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Marcar como pago
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop table */}
      <div className="surface-card hidden overflow-hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Profissional</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Taxa</th>
              <th className="px-4 py-3">Comissão</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  Nenhuma comissão registrada este mês.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-foreground">
                  {r.professional_name}
                </td>
                <td className="px-4 py-3 text-muted">
                  {r.service_description ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatBRL(Number(r.amount))}
                </td>
                <td className="px-4 py-3 text-muted">
                  {Number(r.commission_rate)}%
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {formatBRL(Number(r.commission_amount))}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(r.service_date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.paid_at
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {r.paid_at ? "Pago" : "Pendente"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {!r.paid_at ? (
                      <form action={markCommissionPaidAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Pagar
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteCommissionAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-destructive hover:underline"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
