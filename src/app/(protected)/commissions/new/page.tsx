import Link from "next/link";

import { createCommissionAction } from "@/app/(protected)/commissions/actions";
import { requireOwnerPlanCapability } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewCommissionPage({ searchParams }: Props) {
  await requireOwnerPlanCapability(
    "commissions",
    "O módulo de Comissões está disponível apenas no plano Clínica.",
  );

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="surface-card mx-auto max-w-2xl p-6 md:p-8">
      <h2 className="text-2xl font-bold">Registrar comissão</h2>
      <p className="mt-1 text-sm text-muted">
        Registre a comissão de um profissional por serviço prestado.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createCommissionAction} className="mt-6 space-y-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">
            Profissional *
          </span>
          <input
            name="professional_name"
            required
            placeholder="Nome do profissional"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">
            Serviço realizado
          </span>
          <input
            name="service_description"
            placeholder="Ex: Podologia clínica, reflexologia…"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">
              Valor do serviço (R$) *
            </span>
            <input
              name="amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="0,00"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">
              Taxa de comissão (%) *
            </span>
            <input
              name="commission_rate"
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              placeholder="Ex: 30"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">
            Data do serviço *
          </span>
          <input
            name="service_date"
            type="date"
            required
            defaultValue={today}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">
            Observações
          </span>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-gradient">
            Registrar comissão
          </button>
          <Link href="/commissions" className="btn-outline-modern">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
