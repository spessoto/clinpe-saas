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

    if (body.name !== undefined) updates.name = String(body.name).slice(0, 100);
    if (body.message_template !== undefined)
      updates.message_template = String(body.message_template);
    if (body.trigger_type !== undefined) {
      if (!["hours_before", "days_before"].includes(body.trigger_type)) {
        return NextResponse.json(
          { error: "trigger_type deve ser hours_before ou days_before." },
          { status: 400 },
        );
      }
      updates.trigger_type = body.trigger_type;
    }
    if (body.trigger_value !== undefined) {
      if (typeof body.trigger_value !== "number" || body.trigger_value < 1) {
        return NextResponse.json(
          { error: "trigger_value deve ser um número positivo." },
          { status: 400 },
        );
      }
      updates.trigger_value = body.trigger_value;
    }
    if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar." },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("whatsapp_reminder_templates")
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
    console.error("PUT /api/whatsapp/templates/[id] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    const { error } = await supabase
      .from("whatsapp_reminder_templates")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) {
      return NextResponse.json(
        { error: "Falha ao excluir template." },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/whatsapp/templates/[id] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
