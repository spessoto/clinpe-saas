import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 md:px-10">
      <section className="surface-card p-8 md:p-12">
        <span className="status-chip bg-secondary/10 text-secondary">
          Plataforma de gestão clínica
        </span>
        <BrandLogo className="h-auto w-full max-w-xs" priority />
        <span className="mt-4 inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          Ambiente local configurado
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
          ClinPé SaaS de Podologia
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted md:text-lg">
          Base Next.js pronta para iniciar os épicos de onboarding, pacientes,
          prontuário, autoagendamento e geração de POPs com arquitetura
          multi-tenant usando Supabase.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-up" className="btn-gradient">
            Criar conta
          </Link>
          <Link href="/sign-in" className="btn-outline-modern">
            Entrar
          </Link>
          <Link href="/dashboard" className="btn-outline-modern">
            Ir para dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
