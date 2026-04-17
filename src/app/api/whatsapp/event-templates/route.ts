import { NextRequest, NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const EVENT_TYPES = ["booking", "confirmation", "cancellation"] as const;

const DEFAULT_MESSAGES: Record<string, string> = {
  booking:
    "Olá, {{paciente}}! 👋\n\nSua consulta foi agendada com sucesso!\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAguardamos sua confirmação. Obrigado!",
  confirmation:
    "Olá, {{paciente}}! ✅\n\nSua consulta foi confirmada!\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAguardamos você!",
  cancellation:
    "Olá, {{paciente}}.\n\nInformamos que sua consulta foi cancelada.\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nCaso deseje reagendar, entre em contato conosco.",
};

export async function GET() {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("whatsapp_event_templates")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("event_type");

    if (error) {
      return NextResponse.json(
        { error: "Falha ao buscar templates de evento." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/whatsapp/event-templates error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    const body = await request.json();
    const eventType = body.event_type as string | undefined;

    if (
      !eventType ||
      !EVENT_TYPES.includes(eventType as (typeof EVENT_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "event_type deve ser booking, confirmation ou cancellation." },
        { status: 400 },
      );
    }

    const messageTemplate =
      typeof body.message_template === "string" && body.message_template.trim()
        ? body.message_template
        : DEFAULT_MESSAGES[eventType];

    const { data, error } = await supabase
      .from("whatsapp_event_templates")
      .upsert(
        {
          tenant_id: tenant.id,
          event_type: eventType,
          message_template: messageTemplate,
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
        },
        { onConflict: "tenant_id,event_type" },
      )
      .select()
      .single();

    if (error) {
      console.error("POST event-templates upsert error:", error);
      return NextResponse.json(
        { error: "Falha ao criar template de evento." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/whatsapp/event-templates error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
