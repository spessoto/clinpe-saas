"use client";

import { useState } from "react";

import {
  requestPasswordResetAction,
  resendConfirmationAction,
} from "@/app/auth-actions";

import { RecaptchaForm, RecaptchaSubmitButton } from "./recaptcha-form";

type ModalType = "confirmation" | "password" | null;

type Props = {
  source: "/sign-in" | "/sign-up";
  initialEmail?: string | null;
};

export function AuthHelpModals({ source, initialEmail }: Props) {
  const [modal, setModal] = useState<ModalType>(null);

  const isOpen = modal !== null;
  const isConfirmation = modal === "confirmation";

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
        <button
          type="button"
          onClick={() => setModal("confirmation")}
          className="font-semibold text-secondary underline-offset-2 hover:underline"
        >
          Não recebeu o e-mail de confirmação?
        </button>
        <button
          type="button"
          onClick={() => setModal("password")}
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

            <RecaptchaForm
              serverAction={
                isConfirmation
                  ? resendConfirmationAction
                  : requestPasswordResetAction
              }
              recaptchaAction={
                isConfirmation ? "resend_confirmation" : "recover_password"
              }
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
                label={
                  isConfirmation
                    ? "Reenviar e-mail de confirmação"
                    : "Enviar link de recuperação"
                }
                pendingLabel="Processando..."
                className="btn-gradient w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
              />
            </RecaptchaForm>
          </div>
        </div>
      ) : null}
    </>
  );
}
