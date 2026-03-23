import { createAdminClient } from "@/lib/supabase/admin";
import {
  type StoredPushSubscription,
  sendWebPushNotification,
} from "@/lib/web-push";

export type NewAppointmentNotificationPayload = {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  scheduledAt: string;
};

type CreatedNotification = {
  id: string;
  title: string;
  body: string;
  payload: NewAppointmentNotificationPayload;
  created_at: string;
};

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export async function createNewAppointmentNotification(input: {
  tenantId: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  scheduledAt: string;
  appointmentId: string;
}) {
  const adminClient = createAdminClient();
  const title = "Nova consulta agendada";
  const body = `${input.patientName} solicitou atendimento para ${formatAppointmentDate(input.scheduledAt)}.`;
  const payload: NewAppointmentNotificationPayload = {
    appointmentId: input.appointmentId,
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
    scheduledAt: input.scheduledAt,
  };

  const { data, error } = await adminClient
    .from("notifications")
    .insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      type: "appointment_new_booking",
      title,
      body,
      payload,
    })
    .select("id, title, body, payload, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Falha ao criar notificação interna da consulta.",
    );
  }

  return data as CreatedNotification;
}

export async function sendNewAppointmentPushNotification(input: {
  userId: string;
  notification: CreatedNotification;
}) {
  const adminClient = createAdminClient();
  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", input.userId);

  if (error) {
    console.error("[push] Erro ao buscar push_subscriptions:", error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.warn(
      `[push] Nenhuma subscription encontrada para user_id=${input.userId}. O profissional precisa ativar push em /notifications.`,
    );
    return;
  }

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await sendWebPushNotification(subscription as StoredPushSubscription, {
          title: input.notification.title,
          body: input.notification.body,
          url: "/notifications",
          notificationId: input.notification.id,
          createdAt: input.notification.created_at,
          payload: input.notification.payload,
        });
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await adminClient
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          console.warn(
            `[push] Subscription ${subscription.id} removida (endpoint expirado, status ${statusCode}).`,
          );
        } else {
          console.error(
            `[push] Falha ao enviar push para subscription ${subscription.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }),
  );
}
