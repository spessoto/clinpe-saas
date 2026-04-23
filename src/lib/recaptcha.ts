/**
 * Verifica um token reCAPTCHA v3 no servidor.
 * Retorna `true` quando o token é válido (score ≥ 0.5) ou quando a chave
 * secreta não está configurada (fail-open para não bloquear ambientes de dev).
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[SECURITY] RECAPTCHA_SECRET_KEY não configurada em produção. " +
          "Todos os formulários públicos estão sem proteção contra bots.",
      );
    }
    return true;
  }

  if (!token) return true;

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }).toString(),
    });
    const data = (await res.json()) as { success: boolean; score: number };
    return data.success === true && (data.score ?? 1) >= 0.5;
  } catch {
    return true; // falha de rede → não bloquear
  }
}
