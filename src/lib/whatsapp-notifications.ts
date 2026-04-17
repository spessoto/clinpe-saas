import { sendTextMessage } from "@/lib/evolution-api";
import { createAdminClient } from "@/lib/supabase/admin";

type EventType = "booking" | "confirmation" | "cancellation";

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
    if (!input.patientPhone) return;

    const supabase = createAdminClient();

    // Check tenant WhatsApp connectivity
    const { data: tenant } = await supabase
      .from("tenants")
      .select("evolution_instance_name, whatsapp_status")
      .eq("id", input.tenantId)
      .single();

    if (
      !tenant?.evolution_instance_name ||
      tenant.whatsapp_status !== "connected"
    ) {
      return;
    }

    // Fetch the event template
    const { data: template } = await supabase
      .from("whatsapp_event_templates")
      .select("message_template, enabled")
      .eq("tenant_id", input.tenantId)
      .eq("event_type", input.eventType)
      .single();

    if (!template || !template.enabled) return;

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

    const message = substituteVars(template.message_template, {
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
