"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

const locales = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇪🇸" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeLocale =
    locales.find((item) => item.code === locale) ?? locales[0];

  function onChange(newLocale: string) {
    if (newLocale === locale) {
      detailsRef.current?.removeAttribute("open");
      return;
    }

    // Set the NEXT_LOCALE cookie and refresh so next-intl picks it up
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
    detailsRef.current?.removeAttribute("open");
  }

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex list-none items-center gap-1 rounded-lg border border-slate-200 bg-white/85 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-white">
        <Globe
          className="h-3.5 w-3.5 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <span aria-live="polite">{activeLocale.label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 text-slate-500 transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        {locales.map((item) => (
          <button
            key={item.code}
            type="button"
            disabled={isPending}
            onClick={() => onChange(item.code)}
            className={[
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition",
              locale === item.code
                ? "bg-primary/10 text-primary"
                : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
            aria-label={item.label}
            aria-pressed={locale === item.code}
          >
            <span>
              {item.flag} {item.label}
            </span>
            {locale === item.code ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
    </details>
  );
}
