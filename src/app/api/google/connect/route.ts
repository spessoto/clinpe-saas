import { NextResponse } from "next/server";

import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { requireActiveTenant } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireActiveTenant();
    const state = Buffer.from(
      JSON.stringify({ userId: appUser.id, tenantId: appUser.tenant_id }),
    ).toString("base64url");

    return NextResponse.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao iniciar integracao Google";
    return NextResponse.redirect(
      new URL(
        `/integrations/google?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
