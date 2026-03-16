import { NextRequest, NextResponse } from "next/server";

import { exchangeGoogleCode } from "@/lib/google-calendar";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const parsed = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts: string[] = [];

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      parts.push(parsed.message.trim());
    }

    if (typeof parsed.details === "string" && parsed.details.trim()) {
      parts.push(parsed.details.trim());
    }

    if (typeof parsed.hint === "string" && parsed.hint.trim()) {
      parts.push(`Dica: ${parsed.hint.trim()}`);
    }

    if (typeof parsed.code === "string" && parsed.code.trim()) {
      parts.push(`Codigo: ${parsed.code.trim()}`);
    }

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
}

function isMissingGoogleIntegrationsTable(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const parsed = error as { message?: unknown; code?: unknown };
  const code = typeof parsed.code === "string" ? parsed.code : "";
  const message = typeof parsed.message === "string" ? parsed.message : "";

  return (
    code === "PGRST205" &&
    message.toLowerCase().includes("public.google_integrations")
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=Codigo do Google ausente", request.url),
    );
  }

  const { appUser } = await requireActiveTenant();

  try {
    const supabase = await createClient();
    const { tokens, email } = await exchangeGoogleCode(code);

    const { data: existingIntegration } = await supabase
      .from("google_integrations")
      .select("refresh_token")
      .eq("tenant_id", appUser.tenant_id)
      .eq("user_id", appUser.id)
      .maybeSingle();

    const refreshTokenToPersist =
      tokens.refresh_token ?? existingIntegration?.refresh_token ?? null;

    const { error } = await supabase.from("google_integrations").upsert(
      {
        tenant_id: appUser.tenant_id,
        user_id: appUser.id,
        google_email: email,
        access_token: tokens.access_token ?? null,
        refresh_token: refreshTokenToPersist,
        scope: tokens.scope ?? null,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }

    return NextResponse.redirect(
      new URL("/settings?success=Google Calendar conectado", request.url),
    );
  } catch (error) {
    const message = isMissingGoogleIntegrationsTable(error)
      ? "Tabela public.google_integrations não encontrada no Supabase. Execute a migration 20260312_000004_epic4_epic5_booking_google_pops.sql e tente novamente."
      : toErrorMessage(error, "Falha ao concluir integração Google");

    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
