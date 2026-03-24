import { NextRequest, NextResponse } from "next/server";

import { getAvailableSlotsByTenantId } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], {
      status: 401,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) {
    return NextResponse.json([], {
      status: 403,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  const slots = await getAvailableSlotsByTenantId({
    tenantId: profile.tenant_id,
    professionalId: profile.id,
    date,
  });

  return NextResponse.json(slots, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
