"use client";

import { useRecaptchaPending } from "../recaptcha-form";

export function SignInSubmitButton() {
  const pending = useRecaptchaPending();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="btn-gradient w-full cursor-pointer py-2.5 disabled:cursor-not-allowed disabled:opacity-75"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}
