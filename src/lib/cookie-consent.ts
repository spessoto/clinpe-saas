export const COOKIE_CONSENT_KEY = "pododesk-cookie-consent";

export type CookieConsent = {
  essential: boolean;
  functional: boolean;
  acceptedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

export function hasFunctionalConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.functional === true;
}
