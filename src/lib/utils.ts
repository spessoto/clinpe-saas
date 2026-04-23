import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Key rotated per process start — ensures HMAC output has constant length
// so timingSafeEqual can be used without leaking secret length.
const _HMAC_KEY = randomBytes(32);

/**
 * Timing-safe string comparison that prevents secret-length leakage via
 * HMAC-SHA256 before calling timingSafeEqual (both digests are always 32 bytes).
 */
export function safeSecretEqual(a: string, b: string): boolean {
  const hashA = createHmac("sha256", _HMAC_KEY).update(a).digest();
  const hashB = createHmac("sha256", _HMAC_KEY).update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
