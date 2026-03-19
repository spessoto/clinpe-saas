import Link from "next/link";

import { signInAction } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const message = typeof params.message === "string" ? params.message : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-14">
      <section className="surface-card w-full p-7">
        <BrandLogo className="mx-auto h-auto w-44" priority />
        <h1 className="mt-4 text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse sua conta do ClinPé.</p>

        {message ? (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">E-mail</span>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Senha</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <button type="submit" className="btn-gradient w-full py-2.5">
            Entrar
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-secondary hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </section>
    </main>
  );
}
