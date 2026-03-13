import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth";

export default async function BillingPage() {
  await requireAuthenticatedUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <section className="rounded-2xl border border-warning/40 bg-card p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
          Trial expirado
        </span>
        <h1 className="mt-4 text-2xl font-bold text-secondary">
          Ative sua assinatura
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Seu periodo de teste terminou. Para continuar usando dashboard,
          pacientes e prontuarios, conclua a ativacao da assinatura.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-foreground hover:bg-slate-100"
        >
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
