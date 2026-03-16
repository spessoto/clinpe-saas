"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { sendAppointmentDecisionEmail } from "@/lib/email";
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

async function getManagedAppointment(appointmentId: string) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(
      "id, professional_id, scheduled_at, status, confirmation_status, google_event_id, patient:patients(name, email, phone)",
    )
    .eq("id", appointmentId)
    .eq("tenant_id", appUser.tenant_id)
    .eq("professional_id", appUser.id)
    .single();

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

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .maybeSingle();

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
        const { error } = await supabase
          .from("appointments")
          .update({ confirmation_status: "confirmed" })
          .eq("id", appointment.id)
          .eq("professional_id", appUser.id);

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
          await sendAppointmentDecisionEmail({
            to: appointment.patient.email,
            patientName: appointment.patient.name,
            clinicName: tenant.name,
            professionalName: appUser.full_name,
            scheduledAt: appointment.scheduled_at,
            decision: "confirmed",
          });
        } catch (mailError) {
          warningMessage =
            mailError instanceof Error
              ? mailError.message
              : "Agendamento confirmado, mas o e-mail não pôde ser enviado.";
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao confirmar agendamento.";
    redirect(buildAgendaPath({ month, error: message }));
  }

  if (warningMessage) {
    redirect(buildAgendaPath({ month, warning: warningMessage }));
  }

  redirect(
    buildAgendaPath({
      month,
      success: "Agendamento confirmado e paciente notificado por e-mail.",
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
        await deleteGoogleCalendarEvent(
          integration as {
            access_token: string | null;
            refresh_token: string | null;
            expires_at: string | null;
          },
          appointment.google_event_id,
        );
      }

      const { error } = await supabase
        .from("appointments")
        .update({
          status: "canceled",
          confirmation_status: "rejected",
        })
        .eq("id", appointment.id)
        .eq("professional_id", appUser.id);

      if (error) {
        throw error;
      }

      revalidatePath("/agenda");

      if (!appointment.patient?.email) {
        warningMessage =
          "Agendamento cancelado, mas o paciente não possui e-mail cadastrado.";
      } else {
        try {
          await sendAppointmentDecisionEmail({
            to: appointment.patient.email,
            patientName: appointment.patient.name,
            clinicName: tenant.name,
            professionalName: appUser.full_name,
            scheduledAt: appointment.scheduled_at,
            decision: "canceled",
          });
        } catch (mailError) {
          warningMessage =
            mailError instanceof Error
              ? mailError.message
              : "Agendamento cancelado, mas o e-mail não pôde ser enviado.";
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao cancelar agendamento.";
    redirect(buildAgendaPath({ month, error: message }));
  }

  if (warningMessage) {
    redirect(buildAgendaPath({ month, warning: warningMessage }));
  }

  redirect(
    buildAgendaPath({
      month,
      success: "Agendamento cancelado e paciente notificado por e-mail.",
    }),
  );
}
