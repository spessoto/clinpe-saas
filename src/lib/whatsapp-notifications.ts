import {
  getInstanceConnectionState,
  sendTextMessage,
} from "@/lib/evolution-api";
import { createAdminClient } from "@/lib/supabase/admin";

type EventType = "booking" | "confirmation" | "cancellation";

const DEFAULT_MESSAGES: Record<EventType, string> = {
  booking:
    "Olá, {{paciente}}! 👋\n\nSua consulta foi agendada com sucesso!\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAguardamos sua confirmação. Obrigado!",
  confirmation:
    "Olá, {{paciente}}! ✅\n\nSua consulta foi confirmada!\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAguardamos você!",
  cancellation:
    "Olá, {{paciente}}.\n\nInformamos que sua consulta foi cancelada.\n\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nCaso deseje reagendar, entre em contato conosco.",
};

function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? `{{${key}}}`,
  );
}

function formatRemoteJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55")
    ? `${digits}@s.whatsapp.net`
    : `55${digits}@s.whatsapp.net`;
}

export async function sendWhatsAppEventNotification(input: {
  tenantId: string;
  eventType: EventType;
  patientPhone: string | null;
  patientName: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
}): Promise<void> {
  try {
    if (!input.patientPhone) {
      console.log(
        `[WhatsApp:${input.eventType}] Pulado — paciente sem telefone`,
      );
      return;
    }

    const supabase = createAdminClient();

    // Check tenant WhatsApp connectivity
    const { data: tenant } = await supabase
      .from("tenants")
      .select("evolution_instance_name, whatsapp_status")
      .eq("id", input.tenantId)
      .single();

    if (!tenant?.evolution_instance_name) {
      console.log(
        `[WhatsApp:${input.eventType}] Pulado — tenant sem instância configurada`,
      );
      return;
    }

    // The DB status may be stale (e.g. "qrcode" right after scanning).
    // Do a live check with the Evolution API whenever the cached status is not
    // already "connected" so we never miss a send due to a stale cache.
    let effectiveStatus: string = tenant.whatsapp_status ?? "disconnected";

    if (effectiveStatus !== "connected") {
      try {
        const liveState = await getInstanceConnectionState(
          tenant.evolution_instance_name,
        );
        const liveStatus =
          liveState === "open"
            ? "connected"
            : liveState === "connecting"
              ? "qrcode"
              : "disconnected";

        if (liveStatus !== effectiveStatus) {
          // Update DB so subsequent checks are cheap
          await supabase
            .from("tenants")
            .update({ whatsapp_status: liveStatus })
            .eq("id", input.tenantId);
        }
        effectiveStatus = liveStatus;
      } catch (liveErr) {
        console.warn(
          `[WhatsApp:${input.eventType}] Verificação live de status falhou — usando cache (${effectiveStatus}):`,
          liveErr,
        );
        // Fall through: if live check fails we rely on cached status
      }
    }

    if (effectiveStatus !== "connected") {
      console.log(
        `[WhatsApp:${input.eventType}] Pulado — tenant não conectado (status=${effectiveStatus}, instance=${tenant.evolution_instance_name})`,
      );
      return;
    }

    // Fetch the event template
    const { data: template } = await supabase
      .from("whatsapp_event_templates")
      .select("message_template, enabled")
      .eq("tenant_id", input.tenantId)
      .eq("event_type", input.eventType)
      .single();

    // Auto-create with defaults if not found
    let resolved = template;
    if (!resolved) {
      console.log(
        `[WhatsApp:${input.eventType}] Template não encontrado — criando com defaults`,
      );
      const { data: created, error: upsertError } = await supabase
        .from("whatsapp_event_templates")
        .upsert(
          {
            tenant_id: input.tenantId,
            event_type: input.eventType,
            message_template: DEFAULT_MESSAGES[input.eventType],
            enabled: true,
          },
          { onConflict: "tenant_id,event_type" },
        )
        .select("message_template, enabled")
        .single();

      if (upsertError) {
        console.error(
          `[WhatsApp:${input.eventType}] Erro ao criar template:`,
          upsertError,
        );
      }

      resolved = created;
    }

    if (!resolved || !resolved.enabled) {
      console.log(
        `[WhatsApp:${input.eventType}] Pulado — template desativado ou não encontrado (enabled=${resolved?.enabled ?? "null"})`,
      );
      return;
    }

    const apptDate = new Date(input.scheduledAt);
    const dateStr = apptDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const timeStr = apptDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const message = substituteVars(resolved.message_template, {
      paciente: input.patientName,
      clinica: input.clinicName,
      profissional: input.professionalName,
      data: dateStr,
      horario: timeStr,
    });

    const remoteJid = formatRemoteJid(input.patientPhone);

    await sendTextMessage(tenant.evolution_instance_name, remoteJid, message);
  } catch (err) {
    // Fire-and-forget: log but never throw
    console.error(
      `WhatsApp event notification failed (${input.eventType}):`,
      err,
    );
  }
}
