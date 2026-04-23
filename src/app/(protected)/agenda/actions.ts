"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { getAvailableSlotsByTenantId } from "@/lib/booking";
import {
  sendAppointmentDecisionEmailWithTimeout,
  sendAppointmentNewBookingPatientEmail,
} from "@/lib/email";
import {
  enqueueAppointmentDecisionEmail,
  enqueueAppointmentNewBookingPatientEmail,
} from "@/lib/email-queue";
import type { AppointmentDecisionQueuePayload } from "@/lib/email-queue";
import type { AppointmentNewBookingPatientQueuePayload } from "@/lib/email-queue";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppEventNotification } from "@/lib/whatsapp-notifications";

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
    lower.includes("calendar")
  ) {
    return "Não foi possível concluir a ação no momento. Tente novamente em instantes.";
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

async function sendOrQueueDecisionEmail(
  tenantId: string,
  payload: AppointmentDecisionQueuePayload,
) {
  try {
    const result = await sendAppointmentDecisionEmailWithTimeout(payload);
    if (result === "sent") return;
  } catch {
    // Direct send failed — fall through to queue
  }

  await enqueueAppointmentDecisionEmail({ tenantId, payload });
}

async function sendOrQueueNewBookingPatientEmail(
  tenantId: string,
  payload: AppointmentNewBookingPatientQueuePayload,
) {
  try {
    await sendAppointmentNewBookingPatientEmail(payload);
    return;
  } catch {
    // Direct send failed — fall through to queue
  }

  await enqueueAppointmentNewBookingPatientEmail({ tenantId, payload });
}

async function getManagedAppointment(appointmentId: string) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  let appointmentQuery = supabase
    .from("appointments")
    .select(
      "id, professional_id, scheduled_at, status, confirmation_status, patient:patients(name, email, phone)",
    )
    .eq("id", appointmentId)
    .eq("tenant_id", appUser.tenant_id);

  if (appUser.role === "staff") {
    appointmentQuery = appointmentQuery.eq("professional_id", appUser.id);
  }

  const appointmentResult = await appointmentQuery.single();

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
  const appointmentRecord: {
    id: string;
    professional_id: string;
    scheduled_at: string;
    status: "scheduled" | "completed" | "canceled";
    confirmation_status: "pending" | "confirmed" | "rejected";
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
    patient: patient ?? null,
  };

  return {
    appUser,
    tenant,
    supabase,
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
          await sendOrQueueDecisionEmail(appUser.tenant_id, {
            to: appointment.patient.email,
            patientName: appointment.patient.name,
            clinicName: tenant.name,
            professionalName: appUser.full_name,
            scheduledAt: appointment.scheduled_at,
            decision: "confirmed",
          });
        } catch {
          warningMessage = getFriendlyEmailWarning();
        }
      }

      // WhatsApp notification (awaited — sendWhatsAppEventNotification has internal try/catch and never throws)
      await sendWhatsAppEventNotification({
        tenantId: appUser.tenant_id,
        eventType: "confirmation",
        patientPhone: appointment.patient?.phone ?? null,
        patientName: appointment.patient?.name ?? "",
        clinicName: tenant.name,
        professionalName: appUser.full_name,
        scheduledAt: appointment.scheduled_at,
      });
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
    const { appointment, appUser, tenant, supabase } =
      await getManagedAppointment(appointmentId);

    if (appointment.status === "canceled") {
      warningMessage = "Este agendamento já está cancelado.";
    } else {
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
          await sendOrQueueDecisionEmail(appUser.tenant_id, {
            to: appointment.patient.email,
            patientName: appointment.patient.name,
            clinicName: tenant.name,
            professionalName: appUser.full_name,
            scheduledAt: appointment.scheduled_at,
            decision: "canceled",
          });
        } catch {
          warningMessage = appendWarning(
            warningMessage,
            getFriendlyEmailWarning(),
          );
        }
      }

      // WhatsApp notification (awaited — sendWhatsAppEventNotification has internal try/catch and never throws)
      await sendWhatsAppEventNotification({
        tenantId: appUser.tenant_id,
        eventType: "cancellation",
        patientPhone: appointment.patient?.phone ?? null,
        patientName: appointment.patient?.name ?? "",
        clinicName: tenant.name,
        professionalName: appUser.full_name,
        scheduledAt: appointment.scheduled_at,
      });
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

export async function createAgendaBlockAction(formData: FormData) {
  const month = getField(formData, "month");
  const startDate = getField(formData, "block_date");
  const startTime = getField(formData, "block_start_time");
  const endTime = getField(formData, "block_end_time");
  const reason = getField(formData, "block_reason");

  if (!startDate || !startTime || !endTime) {
    redirect(
      buildAgendaPath({
        month,
        error: "Preencha data e horários do bloqueio.",
      }),
    );
  }

  if (startTime >= endTime) {
    redirect(
      buildAgendaPath({
        month,
        error: "Horário inicial deve ser menor que o final.",
      }),
    );
  }

  const startsAt = new Date(`${startDate}T${startTime}:00`);
  const endsAt = new Date(`${startDate}T${endTime}:00`);

  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    redirect(buildAgendaPath({ month, error: "Data ou horário inválido." }));
  }

  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const { error } = await supabase.from("agenda_blocks").insert({
    tenant_id: appUser.tenant_id,
    professional_id: appUser.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason,
  });

  if (error) {
    redirect(
      buildAgendaPath({
        month,
        error: `Falha ao criar bloqueio: ${error.message}`,
      }),
    );
  }

  revalidatePath("/agenda");
  redirect(
    buildAgendaPath({
      month,
      success: "Horário bloqueado com sucesso.",
    }),
  );
}

export async function deleteAgendaBlockAction(formData: FormData) {
  const month = getField(formData, "month");
  const blockId = getField(formData, "block_id");

  if (!blockId) {
    redirect(buildAgendaPath({ month, error: "Bloqueio inválido." }));
  }

  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("agenda_blocks")
    .delete()
    .eq("id", blockId)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect(
      buildAgendaPath({
        month,
        error: `Falha ao remover bloqueio: ${error.message}`,
      }),
    );
  }

  revalidatePath("/agenda");
  redirect(
    buildAgendaPath({
      month,
      success: "Bloqueio removido com sucesso.",
    }),
  );
}

export async function createManualAppointmentAction(formData: FormData) {
  const month = getField(formData, "month");
  const patientMode = getField(formData, "patient_mode");
  const selectedPatientId = getField(formData, "patient_id");
  const newPatientName = getField(formData, "new_patient_name");
  const newPatientPhone = getField(formData, "new_patient_phone");
  const newPatientEmail = getField(formData, "new_patient_email");
  const scheduledAt = getField(formData, "scheduled_at");
  const isReturn = formData.get("is_return") === "1";

  if (!scheduledAt) {
    redirect(
      buildAgendaPath({
        month,
        error: "Selecione a data e horário da consulta.",
      }),
    );
  }

  const { appUser, tenant } = await requireActiveTenant();
  const adminClient = createAdminClient();
  let warningMessage: string | null = null;

  // Resolve patient
  let patientId: string | null = null;

  if (patientMode === "existing") {
    if (!selectedPatientId) {
      redirect(buildAgendaPath({ month, error: "Selecione um paciente." }));
    }

    // Validate patient belongs to tenant
    const { data: patient } = await adminClient
      .from("patients")
      .select("id")
      .eq("id", selectedPatientId)
      .eq("tenant_id", appUser.tenant_id)
      .maybeSingle();

    if (!patient) {
      redirect(buildAgendaPath({ month, error: "Paciente não encontrado." }));
    }

    patientId = patient.id;
  } else {
    if (!newPatientName || !newPatientPhone) {
      redirect(
        buildAgendaPath({
          month,
          error: "Nome e telefone são obrigatórios para novo paciente.",
        }),
      );
    }

    // Check if patient already exists by phone
    const { data: existingPatient } = await adminClient
      .from("patients")
      .select("id")
      .eq("tenant_id", appUser.tenant_id)
      .eq("phone", newPatientPhone)
      .maybeSingle();

    if (existingPatient) {
      patientId = existingPatient.id;
    } else {
      const { data: insertedPatient, error: patientError } = await adminClient
        .from("patients")
        .insert({
          tenant_id: appUser.tenant_id,
          name: newPatientName,
          phone: newPatientPhone,
          email: newPatientEmail || null,
        })
        .select("id")
        .single();

      if (patientError || !insertedPatient) {
        redirect(
          buildAgendaPath({
            month,
            error: patientError?.message ?? "Falha ao cadastrar paciente.",
          }),
        );
      }

      patientId = insertedPatient.id;
    }
  }

  const { data: patientRecord } = await adminClient
    .from("patients")
    .select("name, email, phone")
    .eq("id", patientId)
    .eq("tenant_id", appUser.tenant_id)
    .maybeSingle();

  // Validate slot is available
  const scheduledDate = scheduledAt.split("T")[0];
  const availableSlots = await getAvailableSlotsByTenantId({
    tenantId: appUser.tenant_id,
    professionalId: appUser.id,
    date: scheduledDate,
  });

  if (!availableSlots.includes(scheduledAt)) {
    redirect(
      buildAgendaPath({
        month,
        error:
          "Horário indisponível. Verifique a agenda e escolha outro horário.",
      }),
    );
  }

  const { error: appointmentError } = await adminClient
    .from("appointments")
    .insert({
      tenant_id: appUser.tenant_id,
      patient_id: patientId,
      professional_id: appUser.id,
      professional_name_snapshot: appUser.full_name,
      scheduled_at: scheduledAt,
      status: "scheduled",
      confirmation_status: "confirmed",
      is_return: isReturn,
    });

  if (appointmentError) {
    redirect(
      buildAgendaPath({
        month,
        error: `Falha ao criar consulta: ${appointmentError.message}`,
      }),
    );
  }

  const patientName = patientRecord?.name ?? newPatientName;
  const patientEmail = patientRecord?.email ?? newPatientEmail;
  const patientPhone = patientRecord?.phone ?? newPatientPhone;

  if (!patientEmail) {
    warningMessage = appendWarning(
      warningMessage,
      "Consulta criada, mas o paciente não possui e-mail cadastrado.",
    );
  } else {
    try {
      await sendOrQueueNewBookingPatientEmail(appUser.tenant_id, {
        to: patientEmail,
        patientName,
        clinicName: tenant.name,
        professionalName: appUser.full_name,
        scheduledAt,
      });
    } catch {
      warningMessage = appendWarning(warningMessage, getFriendlyEmailWarning());
    }
  }

  await sendWhatsAppEventNotification({
    tenantId: appUser.tenant_id,
    eventType: "booking",
    patientPhone,
    patientName,
    clinicName: tenant.name,
    professionalName: appUser.full_name,
    scheduledAt,
  });

  revalidatePath("/agenda");

  if (warningMessage) {
    redirect(buildAgendaPath({ month, warning: warningMessage }));
  }

  redirect(
    buildAgendaPath({
      month,
      success:
        "Consulta adicionada com sucesso. E-mail de confirmação enviado ao paciente.",
    }),
  );
}
