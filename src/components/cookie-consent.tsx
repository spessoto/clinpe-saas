"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  COOKIE_CONSENT_KEY,
  type CookieConsent,
  getCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  function accept(functional: boolean) {
    const consent: CookieConsent = {
      essential: true,
      functional,
      acceptedAt: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 animate-[slideUp_0.4s_ease-out] p-4 md:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur sm:flex-row sm:items-center sm:gap-6 md:p-6">
        <p className="flex-1 text-sm leading-relaxed text-slate-600">
          Utilizamos <strong>cookies essenciais</strong> para autenticação e{" "}
          <strong>cookies funcionais</strong> (reCAPTCHA) para segurança dos
          formulários.{" "}
          <Link
            href="/politica-de-privacidade#cookies"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            Saiba mais
          </Link>
        </p>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => accept(false)}
            className="btn-outline-modern cursor-pointer px-4 py-2 text-sm"
          >
            Somente essenciais
          </button>
          <button
            type="button"
            onClick={() => accept(true)}
            className="btn-gradient cursor-pointer px-4 py-2 text-sm"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
