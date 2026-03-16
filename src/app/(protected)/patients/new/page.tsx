import Link from "next/link";

import { createPatientAction, getPatientCountStatus } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPatientPage({ searchParams }: Props) {
  const { tenant } = await requireActiveTenant();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const isLimitReached = params.limitReached === "true";

  const limitStatus = await getPatientCountStatus();

  if (isLimitReached) {
    return (
      <section className="surface-card max-w-xl p-6">
        <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6 text-center">
          <h2 className="text-2xl font-bold text-destructive">
            Limite de Pacientes Atingido
          </h2>
          <p className="mt-3 text-sm text-destructive/80">
            Você atingiu o limite de <strong>{tenant.max_patients_allowed} pacientes</strong> para seu plano {tenant.billing_tier}.
          </p>

          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted">
              Pacientes atuais: <strong>{limitStatus.current}/{limitStatus.max}</strong>
            </p>

            <button
              onClick={() => window.location.href = "/billing"}
              className="btn-gradient w-full"
            >
              Fazer Upgrade Now
            </button>

            <Link href="/patients" className="btn-outline-modern block">
              Voltar aos Pacientes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card max-w-xl p-6">
      <h2 className="text-2xl font-bold">Novo paciente</h2>
      <p className="mt-1 text-sm text-muted">
        Cadastre o paciente para iniciar o historico clinico.
      </p>

      {limitStatus.remainingSlots <= 3 && !isLimitReached ? (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
          <p className="text-xs font-semibold text-warning">
            ⚠️ Você tem apenas {limitStatus.remainingSlots} slot{limitStatus.remainingSlots !== 1 ? 's' : ''} de paciente{limitStatus.remainingSlots !== 1 ? 's' : ''} restante{limitStatus.remainingSlots !== 1 ? 's' : ''}.
          </p>
          <Link href="/billing" className="mt-2 inline-text-sm font-semibold text-warning hover:underline">
            Fazer upgrade →
          </Link>
        </div>
      ) : null}

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
          <button type="submit" className="btn-gradient">
            Salvar
          </button>
          <Link href="/patients" className="btn-outline-modern">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
