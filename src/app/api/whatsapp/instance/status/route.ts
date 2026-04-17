import { NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import { getInstanceConnectionState } from "@/lib/evolution-api";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    if (!tenant.evolution_instance_name) {
      return NextResponse.json({ status: "disconnected" });
    }

    const state = await getInstanceConnectionState(
      tenant.evolution_instance_name,
    );

    const status =
      state === "open"
        ? "connected"
        : state === "connecting"
          ? "qrcode"
          : "disconnected";

    // Sync status to DB if it changed
    if (status !== tenant.whatsapp_status) {
      await supabase
        .from("tenants")
        .update({ whatsapp_status: status })
        .eq("id", tenant.id);
    }

    return NextResponse.json({ status });
  } catch (err) {
    console.error("GET /api/whatsapp/instance/status error:", err);

    // If Evolution API can't find the instance (likely deleted externally),
    // clean up the orphaned reference so the user can reconnect.
    try {
      const errMsg = String(err);
      if (errMsg.includes("404") || errMsg.includes("not exist")) {
        const { tenant } = await requireActiveTenant();
        const supabase = await createClient();
        await supabase
          .from("tenants")
          .update({
            evolution_instance_name: null,
            evolution_instance_token: null,
            whatsapp_status: "disconnected",
          })
          .eq("id", tenant.id);
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({ status: "disconnected" });
  }
}
