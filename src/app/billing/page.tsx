import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth";

export default async function BillingPage() {
  await requireAuthenticatedUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <section className="surface-card border-warning/40 p-8">
        <span className="inline-flex rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
          Trial expirado
        </span>
        <h1 className="mt-4 text-2xl font-bold">Ative sua assinatura</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Seu periodo de teste terminou. Para continuar usando dashboard,
          pacientes e prontuarios, conclua a ativacao da assinatura.
        </p>
        <Link href="/sign-in" className="btn-outline-modern mt-6">
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
