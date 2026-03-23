"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

type ResetStatus = "checking" | "ready" | "invalid" | "saving";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const exchangedCodeRef = useRef<string | null>(null);

  const [status, setStatus] = useState<ResetStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const shouldExchange = !!code && exchangedCodeRef.current !== code;

      if (shouldExchange) {
        exchangedCodeRef.current = code;
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            if (!cancelled) {
              setError("Link de recuperação inválido ou expirado.");
              setStatus("invalid");
            }
            return;
          }
        }

        window.history.replaceState({}, document.title, "/reset-password");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setError(
            "Não foi possível validar o link de recuperação. Solicite um novo link.",
          );
          setStatus("invalid");
        }
        return;
      }

      if (!cancelled) {
        setStatus("ready");
      }
    }

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(
      formData.get("confirm_password") ?? "",
    ).trim();

    if (password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setError(null);
    setSuccess(null);
    setStatus("saving");

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    await supabase.auth.signOut();
    setSuccess("Senha redefinida com sucesso. Faça login com a nova senha.");

    setTimeout(() => {
      router.replace(
        "/sign-in?message=" +
          encodeURIComponent(
            "Senha redefinida com sucesso. Faça login com a nova senha.",
          ),
      );
    }, 1200);
  }

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
        <h1 className="mt-4 text-2xl font-bold">Redefinir senha</h1>
        <p className="mt-1 text-sm text-muted">
          Defina uma nova senha para sua conta.
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}

        {status === "checking" ? (
          <p className="mt-6 text-sm text-muted">
            Validando link de recuperação...
          </p>
        ) : null}

        {status === "invalid" ? (
          <p className="mt-6 text-sm text-muted">
            Volte para{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-secondary hover:underline"
            >
              Entrar
            </Link>{" "}
            e solicite um novo link.
          </p>
        ) : null}

        {status === "ready" || status === "saving" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Nova senha</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Confirmar nova senha
              </span>
              <input
                type="password"
                name="confirm_password"
                required
                minLength={6}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <button
              type="submit"
              disabled={status === "saving"}
              className="btn-gradient w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {status === "saving" ? "Atualizando..." : "Atualizar senha"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
