import { NextRequest, NextResponse } from "next/server";

import { getWhatsAppReminderEnv } from "@/lib/env";
import { sendTextMessage } from "@/lib/evolution-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeSecretEqual } from "@/lib/utils";

type ReminderTemplate = {
  id: string;
  tenant_id: string;
  message_template: string;
  trigger_type: "hours_before" | "days_before";
  trigger_value: number;
};

const REMINDER_WINDOW_LOOKBACK_MINUTES = 75;
const REMINDER_WINDOW_LOOKAHEAD_MINUTES = 15;

function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? `{{${key}}}`,
  );
}

export async function POST(request: NextRequest) {
  try {
    const env = getWhatsAppReminderEnv();
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || !safeSecretEqual(token, env.WHATSAPP_REMINDER_CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Fetch all enabled templates grouped by tenant
    const { data: templates, error: tplError } = await supabase
      .from("whatsapp_reminder_templates")
      .select("id, tenant_id, message_template, trigger_type, trigger_value")
      .eq("enabled", true);

    if (tplError || !templates || templates.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Nenhum template ativo encontrado.",
      });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const tpl of templates as ReminderTemplate[]) {
      // Calculate the appointment window for this template
      const offsetMs =
        tpl.trigger_type === "hours_before"
          ? tpl.trigger_value * 60 * 60 * 1000
          : tpl.trigger_value * 24 * 60 * 60 * 1000;

      // Use a wider backward window to tolerate cron delays without missing reminders.
      const windowStart = new Date(
        now.getTime() + offsetMs - REMINDER_WINDOW_LOOKBACK_MINUTES * 60 * 1000,
      );
      const windowEnd = new Date(
        now.getTime() +
          offsetMs +
          REMINDER_WINDOW_LOOKAHEAD_MINUTES * 60 * 1000,
      );

      const { data: appointments } = await supabase
        .from("appointments")
        .select(
          "id, scheduled_at, patients!inner(name, phone), tenants!inner(name, evolution_instance_name, whatsapp_status), users!inner(full_name)",
        )
        .eq("tenant_id", tpl.tenant_id)
        .gte("scheduled_at", windowStart.toISOString())
        .lte("scheduled_at", windowEnd.toISOString())
        .eq("status", "scheduled");

      if (!appointments || appointments.length === 0) continue;

      for (const appt of appointments) {
        const tenant = appt.tenants as unknown as {
          name: string;
          evolution_instance_name: string | null;
          whatsapp_status: string | null;
        };
        const patient = appt.patients as unknown as {
          name: string;
          phone: string | null;
        };
        const professional = appt.users as unknown as {
          full_name: string;
        };

        if (
          !tenant.evolution_instance_name ||
          tenant.whatsapp_status !== "connected"
        )
          continue;
        if (!patient.phone) continue;

        // Check if already sent for this appointment + template
        const { count: alreadySent } = await supabase
          .from("whatsapp_reminders_sent")
          .select("id", { count: "exact", head: true })
          .eq("appointment_id", appt.id)
          .eq("template_id", tpl.id);

        if ((alreadySent ?? 0) > 0) continue;

        const phoneDigits = patient.phone.replace(/\D/g, "");
        const remoteJid = phoneDigits.startsWith("55")
          ? `${phoneDigits}@s.whatsapp.net`
          : `55${phoneDigits}@s.whatsapp.net`;

        const apptDate = new Date(appt.scheduled_at);
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

        const message = substituteVars(tpl.message_template, {
          paciente: patient.name,
          clinica: tenant.name,
          profissional: professional.full_name,
          data: dateStr,
          horario: timeStr,
        });

        try {
          await sendTextMessage(
            tenant.evolution_instance_name,
            remoteJid,
            message,
          );

          await supabase.from("whatsapp_reminders_sent").insert({
            appointment_id: appt.id,
            template_id: tpl.id,
          });

          sentCount++;
        } catch (err) {
          console.error(
            `Failed to send reminder for appointment ${appt.id}, template ${tpl.id}:`,
            err,
          );
          errorCount++;
        }
      }
    }

    return NextResponse.json({ sent: sentCount, errors: errorCount });
  } catch (err) {
    console.error("Reminder processing error:", err);
    return NextResponse.json(
      { error: "Falha ao processar lembretes." },
      { status: 500 },
    );
  }
}
