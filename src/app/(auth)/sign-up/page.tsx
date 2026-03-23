import Link from "next/link";

import { signUpAction } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { RecaptchaForm, RecaptchaSubmitButton } from "../recaptcha-form";
import { ResendConfirmationForm } from "../resend-confirmation-form";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const message = typeof params.message === "string" ? params.message : null;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden px-6 py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -left-24 top-[-120px] h-80 w-80 rounded-full bg-gradient-to-br from-primary/45 to-secondary/25 blur-3xl" />
        <div className="absolute -right-28 bottom-[-120px] h-96 w-96 rounded-full bg-gradient-to-tl from-secondary/35 to-primary/20 blur-3xl" />
      </div>

      <section className="surface-card mx-auto w-full max-w-md p-7">
        <BrandLogo className="mx-auto h-auto w-44" priority />
        <h1 className="mt-4 text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">
          Comece seu trial de 7 dias no PodoDesk.
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {message}
          </p>
        ) : null}

        <RecaptchaForm
          serverAction={signUpAction}
          recaptchaAction="signup"
          className="mt-6 space-y-4"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Nome completo</span>
            <input
              name="full_name"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Nome da clínica</span>
            <input
              name="clinic_name"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">CPF / CNPJ</span>
            <input
              name="cpf_cnpj"
              required
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Cupom de desconto
            </span>
            <input
              name="coupon_code"
              placeholder="Opcional"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
            <span className="mt-1 block text-xs text-muted">
              Se válido, o cupom fica vinculado à sua conta e poderá ser usado
              na assinatura paga.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Registro Profissional / Número de Diploma
            </span>
            <input
              name="professional_register"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">E-mail</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={email}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Senha</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <RecaptchaSubmitButton label="Criar conta" />
        </RecaptchaForm>

        <p className="mt-4 text-sm text-muted">
          Já tem conta?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-secondary hover:underline"
          >
            Entrar
          </Link>
        </p>

        <ResendConfirmationForm source="/sign-up" initialEmail={email} />
      </section>
    </main>
  );
}
