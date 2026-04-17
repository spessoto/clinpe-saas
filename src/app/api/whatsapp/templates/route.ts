import { NextRequest, NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("whatsapp_reminder_templates")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("position");

    if (error) {
      return NextResponse.json(
        { error: "Falha ao buscar templates." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/whatsapp/templates error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    // Check max 3 templates
    const { count } = await supabase
      .from("whatsapp_reminder_templates")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Limite de 3 templates atingido." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, message_template, trigger_type, trigger_value, enabled } =
      body;

    if (!name || !message_template || !trigger_type || !trigger_value) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: name, message_template, trigger_type, trigger_value.",
        },
        { status: 400 },
      );
    }

    if (!["hours_before", "days_before"].includes(trigger_type)) {
      return NextResponse.json(
        { error: "trigger_type deve ser hours_before ou days_before." },
        { status: 400 },
      );
    }

    if (typeof trigger_value !== "number" || trigger_value < 1) {
      return NextResponse.json(
        { error: "trigger_value deve ser um número positivo." },
        { status: 400 },
      );
    }

    // Find next available position
    const { data: existing } = await supabase
      .from("whatsapp_reminder_templates")
      .select("position")
      .eq("tenant_id", tenant.id)
      .order("position");

    const usedPositions = new Set(
      (existing ?? []).map((t: { position: number }) => t.position),
    );
    const nextPosition = [1, 2, 3].find((p) => !usedPositions.has(p));

    if (!nextPosition) {
      return NextResponse.json(
        { error: "Limite de 3 templates atingido." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("whatsapp_reminder_templates")
      .insert({
        tenant_id: tenant.id,
        name: String(name).slice(0, 100),
        message_template: String(message_template),
        trigger_type,
        trigger_value,
        enabled: enabled ?? true,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error("Template insert error:", error);
      return NextResponse.json(
        { error: "Falha ao criar template." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/whatsapp/templates error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
