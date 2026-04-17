import { NextRequest, NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.message_template !== undefined) {
      updates.message_template = String(body.message_template);
    }
    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar." },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("whatsapp_event_templates")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Template não encontrado ou falha ao atualizar." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/whatsapp/event-templates/[id] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
