"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { enqueueAppointmentDecisionEmail } from "@/lib/email-queue";
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function buildAgendaPath(input: {
  month?: string;
  success?: string;
  error?: string;
  warning?: string;
}) {
  const search = new URLSearchParams();

  if (input.month) {
    search.set("month", input.month);
  }

  if (input.success) {
    search.set("success", input.success);
  }

  if (input.error) {
    search.set("error", input.error);
  }

  if (input.warning) {
    search.set("warning", input.warning);
  }

  const query = search.toString();
  return query ? `/agenda?${query}` : "/agenda";
}

function appendWarning(current: string | null, incoming: string | null) {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  return `${current} ${incoming}`;
}

function getFriendlyActionError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const message = error.message.trim();
  const lower = message.toLowerCase();

  if (lower.includes("agendamento não encontrado")) {
    return "Agendamento não encontrado ou sem permissão para esta ação.";
  }

  if (
    lower.includes("resource has been deleted") ||
    lower.includes("calendar") ||
    lower.includes("google")
  ) {
    return "Não foi possível sincronizar com o Google Calendar no momento. Tente novamente em instantes.";
  }

  if (
    lower.includes("smtp") ||
    lower.includes("nodemailer") ||
    lower.includes("econn")
  ) {
    return "A ação foi registrada, mas houve instabilidade no envio de e-mail.";
  }

  return fallbackMessage;
}

function getFriendlyEmailWarning() {
  return "A ação foi concluída, mas o e-mail de notificação não pôde ser enviado agora.";
}

async function getManagedAppointment(appointmentId: string) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  let appointmentQuery = supabase
    .from("appointments")
    .select(
      "id, professional_id, scheduled_at, status, confirmation_status, google_event_id, patient:patients(name, email, phone)",
    )
    .eq("id", appointmentId)
    .eq("tenant_id", appUser.tenant_id);

  if (appUser.role === "staff") {
    appointmentQuery = appointmentQuery.eq("professional_id", appUser.id);
  }

  const [appointmentResult, integrationResult] = await Promise.all([
    appointmentQuery.single(),
    supabase
      .from("google_integrations")
      .select("access_token, refresh_token, expires_at")
      .eq("tenant_id", appUser.tenant_id)
      .eq("user_id", appUser.id)
      .maybeSingle(),
  ]);

  const { data: appointment, error } = appointmentResult;

  if (error || !appointment) {
    throw new Error("Agendamento não encontrado.");
  }

  const patient = Array.isArray(appointment.patient)
    ? (appointment.patient[0] as
        | {
            name: string;
            email: string | null;
            phone: string | null;
          }
        | undefined)
    : ((appointment.patient as {
        name: string;
        email: string | null;
        phone: string | null;
      } | null) ?? null);

  const { data: integration } = integrationResult;

  const appointmentRecord: {
    id: string;
    professional_id: string;
    scheduled_at: string;
    status: "scheduled" | "completed" | "canceled";
    confirmation_status: "pending" | "confirmed" | "rejected";
    google_event_id: string | null;
    patient: {
      name: string;
      email: string | null;
      phone: string | null;
    } | null;
  } = {
    id: appointment.id,
    professional_id: appointment.professional_id,
    scheduled_at: appointment.scheduled_at,
    status: appointment.status,
    confirmation_status: appointment.confirmation_status,
    google_event_id: appointment.google_event_id,
    patient: patient ?? null,
  };

  return {
    appUser,
    tenant,
    supabase,
    integration,
    appointment: appointmentRecord,
  };
}

export async function confirmAppointmentAction(formData: FormData) {
  const appointmentId = getField(formData, "appointment_id");
  const month = getField(formData, "month");
  let warningMessage: string | null = null;

  if (!appointmentId) {
    redirect(buildAgendaPath({ month, error: "Agendamento inválido." }));
  }

  try {
    const { appointment, appUser, tenant, supabase } =
      await getManagedAppointment(appointmentId);

    if (appointment.status === "canceled") {
      warningMessage = "Não é possível confirmar um agendamento cancelado.";
    } else {
      if (appointment.confirmation_status !== "confirmed") {
        let updateQuery = supabase
          .from("appointments")
          .update({ confirmation_status: "confirmed" })
          .eq("id", appointment.id);

        if (appUser.role === "staff") {
          updateQuery = updateQuery.eq("professional_id", appUser.id);
        }

        const { error } = await updateQuery;

        if (error) {
          throw error;
        }
      }

      revalidatePath("/agenda");

      if (!appointment.patient?.email) {
        warningMessage =
          "Agendamento confirmado, mas o paciente não possui e-mail cadastrado.";
      } else {
        try {
          await enqueueAppointmentDecisionEmail({
            tenantId: appUser.tenant_id,
            payload: {
              to: appointment.patient.email,
              patientName: appointment.patient.name,
              clinicName: tenant.name,
              professionalName: appUser.full_name,
              scheduledAt: appointment.scheduled_at,
              decision: "confirmed",
            },
          });
        } catch {
          warningMessage = getFriendlyEmailWarning();
        }
      }
    }
  } catch (error) {
    const message = getFriendlyActionError(
      error,
      "Falha ao confirmar agendamento.",
    );
    redirect(buildAgendaPath({ month, error: message }));
  }

  if (warningMessage) {
    redirect(buildAgendaPath({ month, warning: warningMessage }));
  }

  redirect(
    buildAgendaPath({
      month,
      success: "Agendamento confirmado. O paciente será notificado por e-mail.",
    }),
  );
}

export async function cancelAppointmentAction(formData: FormData) {
  const appointmentId = getField(formData, "appointment_id");
  const month = getField(formData, "month");
  let warningMessage: string | null = null;

  if (!appointmentId) {
    redirect(buildAgendaPath({ month, error: "Agendamento inválido." }));
  }

  try {
    const { appointment, appUser, tenant, supabase, integration } =
      await getManagedAppointment(appointmentId);

    if (appointment.status === "canceled") {
      warningMessage = "Este agendamento já está cancelado.";
    } else {
      if (
        appointment.google_event_id &&
        (integration?.refresh_token || integration?.access_token)
      ) {
        try {
          await deleteGoogleCalendarEvent(
            integration as {
              access_token: string | null;
              refresh_token: string | null;
              expires_at: string | null;
            },
            appointment.google_event_id,
          );
        } catch {
          warningMessage = appendWarning(
            warningMessage,
            "Agendamento cancelado no sistema, mas não foi possível sincronizar a exclusão no Google Calendar.",
          );
        }
      }

      let updateQuery = supabase
        .from("appointments")
        .update({
          status: "canceled",
          confirmation_status: "rejected",
        })
        .eq("id", appointment.id);

      if (appUser.role === "staff") {
        updateQuery = updateQuery.eq("professional_id", appUser.id);
      }

      const { error } = await updateQuery;

      if (error) {
        throw error;
      }

      revalidatePath("/agenda");

      if (!appointment.patient?.email) {
        warningMessage = appendWarning(
          warningMessage,
          "Agendamento cancelado, mas o paciente não possui e-mail cadastrado.",
        );
      } else {
        try {
          await enqueueAppointmentDecisionEmail({
            tenantId: appUser.tenant_id,
            payload: {
              to: appointment.patient.email,
              patientName: appointment.patient.name,
              clinicName: tenant.name,
              professionalName: appUser.full_name,
              scheduledAt: appointment.scheduled_at,
              decision: "canceled",
            },
          });
        } catch {
          warningMessage = appendWarning(
            warningMessage,
            getFriendlyEmailWarning(),
          );
        }
      }
    }
  } catch (error) {
    const message = getFriendlyActionError(
      error,
      "Falha ao cancelar agendamento.",
    );
    redirect(buildAgendaPath({ month, error: message }));
  }

  if (warningMessage) {
    redirect(buildAgendaPath({ month, warning: warningMessage }));
  }

  redirect(
    buildAgendaPath({
      month,
      success: "Agendamento cancelado. O paciente será notificado por e-mail.",
    }),
  );
}
