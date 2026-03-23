export const COOKIE_CONSENT_KEY = "pododesk-cookie-consent";
export const COOKIE_CONSENT_EVENT = "pododesk-cookie-consent-change";

export type CookieConsent = {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  acceptedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return {
      essential: true,
      functional: parsed.functional === true,
      analytics: parsed.analytics === true,
      acceptedAt:
        typeof parsed.acceptedAt === "string"
          ? parsed.acceptedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }),
  );
}

export function hasFunctionalConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.functional === true;
}

export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics === true;
}
