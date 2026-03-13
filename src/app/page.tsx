import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 md:px-10">
      <section className="rounded-3xl border border-slate-200 bg-surface p-8 shadow-sm md:p-12">
        <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          Ambiente local configurado
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-secondary md:text-5xl">
          ClinPe SaaS de Podologia
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted md:text-lg">
          Base Next.js pronta para iniciar os epicos de onboarding, pacientes,
          prontuario, autoagendamento e geracao de POPs com arquitetura
          multi-tenant usando Supabase.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Criar conta
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-foreground hover:bg-slate-100"
          >
            Entrar
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/10"
          >
            Ir para dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
