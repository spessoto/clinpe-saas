import { NextRequest, NextResponse } from "next/server";

import { getEvolutionEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeSecretEqual } from "@/lib/utils";

/**
 * POST /api/whatsapp/webhook
 *
 * Receives Evolution API webhook events and keeps the tenants.whatsapp_status
 * column in sync so that outbound notifications don't rely on stale DB cache.
 *
 * Security: callers must supply the EVOLUTION_WEBHOOK_SECRET via the
 * "apikey" header (configured in the Evolution API webhook setup).
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEvolutionEnv();

    // Evolution API sends the configured key in the "apikey" header.
    // Also accept it as a query param for manual testing.
    const apiKey =
      request.headers.get("apikey") ??
      request.nextUrl.searchParams.get("apikey");

    if (!apiKey || !safeSecretEqual(apiKey, env.EVOLUTION_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: true });
    }

    // Evolution API v2 uses uppercase event names ("CONNECTION_UPDATE").
    // Normalise to lowercase for safety.
    const event = String(body.event ?? "")
      .toLowerCase()
      .replace(".", "_");

    if (event !== "connection_update") {
      // We only care about connection state changes.
      return NextResponse.json({ ok: true });
    }

    const instanceName = body.instance as string | undefined;
    // State can sit at different nesting levels across Evolution API versions.
    const state = (body.data?.state ??
      body.data?.instance?.state ??
      body.state) as string | undefined;

    if (!instanceName || !state) {
      return NextResponse.json({ ok: true });
    }

    const status =
      state === "open"
        ? "connected"
        : state === "connecting"
          ? "qrcode"
          : "disconnected";

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tenants")
      .update({ whatsapp_status: status })
      .eq("evolution_instance_name", instanceName);

    if (error) {
      console.error(
        `[EvolutionWebhook] Failed to update whatsapp_status for "${instanceName}":`,
        error,
      );
    } else {
      console.log(`[EvolutionWebhook] "${instanceName}" → ${status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Always return 200 so Evolution API doesn't disable the webhook.
    console.error("[EvolutionWebhook] Unexpected error:", err);
    return NextResponse.json({ ok: true });
  }
}
