import { resendConfirmationAction } from "@/app/auth-actions";

import { RecaptchaForm, RecaptchaSubmitButton } from "./recaptcha-form";

type Props = {
  source: "/sign-in" | "/sign-up";
  initialEmail?: string | null;
};

export function ResendConfirmationForm({ source, initialEmail }: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-sm font-semibold text-foreground">
        Não recebeu o e-mail de confirmação?
      </h2>
      <p className="mt-1 text-xs text-muted">
        Reenviamos um novo link de ativação para o e-mail informado abaixo.
      </p>

      <RecaptchaForm
        serverAction={resendConfirmationAction}
        recaptchaAction="resend_confirmation"
        className="mt-3 space-y-3"
      >
        <input type="hidden" name="source" value={source} />
        <label className="block text-sm">
          <span className="mb-1 block text-foreground">E-mail</span>
          <input
            type="email"
            name="email"
            required
            defaultValue={initialEmail ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <RecaptchaSubmitButton
          label="Reenviar e-mail de confirmação"
          pendingLabel="Reenviando..."
          className="btn-outline-modern w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
        />
      </RecaptchaForm>
    </div>
  );
}
