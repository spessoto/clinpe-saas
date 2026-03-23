"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  resendConfirmationAction,
  verifyRecaptchaAction,
} from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/client";

import { RecaptchaForm, RecaptchaSubmitButton } from "./recaptcha-form";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

type GRecaptcha = {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
};

function shouldUseRecaptcha() {
  if (!SITE_KEY) return false;
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

type ModalType = "confirmation" | "password" | null;

type Props = {
  source: "/sign-in" | "/sign-up";
  initialEmail?: string | null;
};

export function AuthHelpModals({ source, initialEmail }: Props) {
  const [modal, setModal] = useState<ModalType>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const isOpen = modal !== null;
  const isConfirmation = modal === "confirmation";

  function openModal(type: ModalType) {
    setPwError(null);
    setPwSuccess(false);
    setModal(type);
  }

  /** Password reset is handled fully client-side so that the PKCE code verifier
   *  is stored in the browser's localStorage by createBrowserClient — the same
   *  place exchangeCodeForSession() will look for it on /reset-password. */
  async function handlePasswordResetSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    const email = emailRef.current?.value.trim().toLowerCase() ?? "";
    if (!email) {
      setPwError("Informe o e-mail para recuperação de senha.");
      return;
    }

    startTransition(async () => {
      // 1. Verify reCAPTCHA server-side
      let recaptchaToken = "";
      if (shouldUseRecaptcha()) {
        try {
          const gr = (window as unknown as { grecaptcha: GRecaptcha })
            .grecaptcha;
          await new Promise<void>((resolve) => gr.ready(resolve));
          recaptchaToken = await gr.execute(SITE_KEY, {
            action: "recover_password",
          });
        } catch {
          // reCAPTCHA unavailable — server will decide
        }
      }

      if (recaptchaToken) {
        const { ok, error: recaptchaError } =
          await verifyRecaptchaAction(recaptchaToken);
        if (!ok) {
          setPwError(recaptchaError ?? "Verificação de segurança falhou.");
          return;
        }
      }

      // 2. Call resetPasswordForEmail from the BROWSER client so the PKCE
      //    code verifier lands in localStorage (where exchangeCodeForSession reads it).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const isRateLimit =
          error.message.toLowerCase().includes("rate limit") ||
          (error as { status?: number }).status === 429;
        setPwError(
          isRateLimit
            ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente."
            : "Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes.",
        );
        return;
      }

      setPwSuccess(true);
    });
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
        <button
          type="button"
          onClick={() => openModal("confirmation")}
          className="font-semibold text-secondary underline-offset-2 hover:underline"
        >
          Não recebeu o e-mail de confirmação?
        </button>
        <button
          type="button"
          onClick={() => openModal("password")}
          className="font-semibold text-secondary underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="surface-card w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-secondary">
                  {isConfirmation ? "Reenviar confirmação" : "Recuperar senha"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isConfirmation
                    ? "Informe seu e-mail para receber um novo link de ativação."
                    : "Informe seu e-mail para receber o link de redefinição de senha."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn-outline-modern px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            {isConfirmation ? (
              /* Resend confirmation — keeps server action flow (no PKCE involved) */
              <RecaptchaForm
                serverAction={resendConfirmationAction}
                recaptchaAction="resend_confirmation"
                className="mt-4 space-y-3"
              >
                <input type="hidden" name="source" value={source} />
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">E-mail</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoFocus
                    defaultValue={initialEmail ?? ""}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                  />
                </label>
                <RecaptchaSubmitButton
                  label="Reenviar e-mail de confirmação"
                  pendingLabel="Processando..."
                  className="btn-gradient w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
                />
              </RecaptchaForm>
            ) : (
              /* Password recovery — fully client-side to fix PKCE verifier storage */
              <form
                onSubmit={handlePasswordResetSubmit}
                className="mt-4 space-y-3"
              >
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">E-mail</span>
                  <input
                    ref={emailRef}
                    type="email"
                    name="email"
                    required
                    autoFocus
                    defaultValue={initialEmail ?? ""}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                  />
                </label>

                {pwError ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {pwError}
                  </p>
                ) : null}

                {pwSuccess ? (
                  <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                    Enviamos as instruções para redefinir sua senha. Verifique
                    sua caixa de entrada e spam.
                  </p>
                ) : (
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-gradient w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isPending
                      ? "Processando..."
                      : "Enviar link de recuperação"}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
