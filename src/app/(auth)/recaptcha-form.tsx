"use client";

import {
  createContext,
  useContext,
  useTransition,
  useEffect,
  type ReactNode,
} from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

const PendingCtx = createContext(false);

export function useRecaptchaPending() {
  return useContext(PendingCtx);
}

interface RecaptchaFormProps {
  serverAction: (fd: FormData) => Promise<void>;
  recaptchaAction?: string;
  className?: string;
  children: ReactNode;
}

type GRecaptcha = {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
};

export function RecaptchaForm({
  serverAction,
  recaptchaAction = "submit",
  className,
  children,
}: RecaptchaFormProps) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!SITE_KEY || document.querySelector(`script[src*="recaptcha/api.js"]`))
      return;
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (SITE_KEY) {
      try {
        const gr = (window as unknown as { grecaptcha: GRecaptcha }).grecaptcha;
        await new Promise<void>((resolve) => gr.ready(resolve));
        const token = await gr.execute(SITE_KEY, { action: recaptchaAction });
        formData.append("recaptcha_token", token);
      } catch {
        // reCAPTCHA indisponível (ex: ad-blocker) — server decidirá
      }
    }

    startTransition(async () => {
      await serverAction(formData);
    });
  }

  return (
    <PendingCtx.Provider value={isPending}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </PendingCtx.Provider>
  );
}

export function RecaptchaSubmitButton({
  label,
  pendingLabel = "Aguarde...",
  disabled: disabledProp = false,
  className = "btn-gradient w-full cursor-pointer py-2.5 disabled:cursor-not-allowed disabled:opacity-75",
}: {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const pending = useContext(PendingCtx);

  return (
    <button
      type="submit"
      disabled={pending || disabledProp}
      aria-disabled={pending || disabledProp}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
