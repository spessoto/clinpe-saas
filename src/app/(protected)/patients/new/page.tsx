import Link from "next/link";

import { createPatientAction } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPatientPage({ searchParams }: Props) {
  await requireActiveTenant();

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <section className="max-w-xl rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-secondary">Novo paciente</h2>
      <p className="mt-1 text-sm text-muted">
        Cadastre o paciente para iniciar o historico clinico.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createPatientAction} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Nome</span>
          <input
            name="name"
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Telefone</span>
          <input
            name="phone"
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Data de nascimento</span>
          <input
            type="date"
            name="birth_date"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Salvar
          </button>
          <Link
            href="/patients"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
