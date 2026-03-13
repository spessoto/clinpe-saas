import { NextRequest, NextResponse } from "next/server";

import { exchangeGoogleCode } from "@/lib/google-calendar";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/integrations/google?error=Codigo do Google ausente",
        request.url,
      ),
    );
  }

  try {
    const { appUser } = await requireActiveTenant();
    const supabase = await createClient();
    const { tokens, email } = await exchangeGoogleCode(code);

    const { error } = await supabase.from("google_integrations").upsert({
      tenant_id: appUser.tenant_id,
      user_id: appUser.id,
      google_email: email,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    });

    if (error) {
      throw error;
    }

    return NextResponse.redirect(
      new URL(
        "/integrations/google?success=Google Calendar conectado",
        request.url,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao concluir integracao Google";
    return NextResponse.redirect(
      new URL(
        `/integrations/google?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
