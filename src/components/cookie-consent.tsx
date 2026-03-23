"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  type CookieConsent,
  getCookieConsent,
  saveCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setVisible(true);
      return;
    }

    setFunctional(existing.functional);
    setAnalytics(existing.analytics);
  }, []);

  function persist(consent: CookieConsent) {
    saveCookieConsent(consent);
    setFunctional(consent.functional);
    setAnalytics(consent.analytics);
    setVisible(false);
    setShowSettings(false);
  }

  function acceptAll() {
    const consent: CookieConsent = {
      essential: true,
      functional: true,
      analytics: true,
      acceptedAt: new Date().toISOString(),
    };
    persist(consent);
  }

  function acceptEssentialOnly() {
    persist({
      essential: true,
      functional: false,
      analytics: false,
      acceptedAt: new Date().toISOString(),
    });
  }

  function savePreferences() {
    persist({
      essential: true,
      functional,
      analytics,
      acceptedAt: new Date().toISOString(),
    });
  }

  if (!visible && !showSettings) {
    return (
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur hover:border-primary/30 hover:text-primary md:bottom-6 md:left-6"
      >
        Cookies
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 animate-[slideUp_0.4s_ease-out] p-4 md:p-6"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Preferências de cookies e tecnologias similares
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Utilizamos <strong>cookies essenciais</strong> para
                autenticação,
                <strong> funcionais</strong> para segurança dos formulários e,
                mediante consentimento, <strong>analytics</strong> para medir
                uso do site com Google Analytics e Microsoft Clarity. O Google
                Search Console pode usar uma meta tag de verificação técnica,
                sem coleta analítica por si só.{" "}
                <Link
                  href="/politica-de-privacidade#cookies"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  Saiba mais
                </Link>
              </p>
            </div>

            {!visible && (
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            )}
          </div>

          {(showSettings || visible) && (
            <div className="grid gap-3 md:grid-cols-3">
              <CategoryCard
                title="Essenciais"
                description="Sempre ativos para login, sessão e funcionamento básico da plataforma."
                checked
                disabled
              />
              <CategoryCard
                title="Funcionais"
                description="Proteção anti-bot com reCAPTCHA nos formulários públicos."
                checked={functional}
                onChange={setFunctional}
              />
              <CategoryCard
                title="Analytics"
                description="Medição de tráfego e usabilidade com Google Analytics e Microsoft Clarity."
                checked={analytics}
                onChange={setAnalytics}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={acceptEssentialOnly}
              className="btn-outline-modern cursor-pointer px-4 py-2 text-sm"
            >
              Somente essenciais
            </button>
            <button
              type="button"
              onClick={savePreferences}
              className="btn-outline-modern cursor-pointer px-4 py-2 text-sm"
            >
              Salvar preferências
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="btn-gradient cursor-pointer px-4 py-2 text-sm"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 leading-relaxed text-slate-600">{description}</p>
        </div>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary"
        />
      </div>
    </label>
  );
}
