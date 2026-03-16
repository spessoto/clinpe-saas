import { NextResponse } from "next/server";

import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { requireActiveTenant } from "@/lib/auth";

function getPublicAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  return process.env.NODE_ENV === "production"
    ? "https://pododesk.com.br"
    : "http://localhost:3000";
}

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

export async function GET(request: Request) {
  const { appUser } = await requireActiveTenant();

  try {
    const state = Buffer.from(
      JSON.stringify({ userId: appUser.id, tenantId: appUser.tenant_id }),
    ).toString("base64url");

    return NextResponse.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    const message = toErrorMessage(error, "Falha ao iniciar integração Google");
    const appUrl = getPublicAppUrl();

    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, appUrl),
    );
  }
}
