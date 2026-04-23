import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type SupportedLocale = (typeof routing.locales)[number];

function normalizeLocale(
  value: string | null | undefined,
): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const shortCode = value.toLowerCase().split("-")[0];
  return routing.locales.includes(shortCode as SupportedLocale)
    ? (shortCode as SupportedLocale)
    : null;
}

function getLocaleFromAcceptLanguage(
  value: string | null,
): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const candidates = value
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookie = normalizeLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const fromHeader = getLocaleFromAcceptLanguage(
    headerStore.get("accept-language"),
  );

  const locale = fromCookie ?? fromHeader ?? routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
