"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";

const locales = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇪🇸" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(newLocale: string) {
    // Set the NEXT_LOCALE cookie and refresh so next-intl picks it up
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="relative flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-1 py-0.5 shadow-sm">
      <Globe className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      {locales.map((l) => (
        <button
          key={l.code}
          type="button"
          disabled={isPending}
          onClick={() => onChange(l.code)}
          className={[
            "rounded px-2 py-1 text-xs font-bold transition",
            locale === l.code
              ? "bg-primary text-white"
              : "text-slate-600 hover:bg-slate-100",
          ].join(" ")}
          aria-label={l.label}
          aria-pressed={locale === l.code}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
