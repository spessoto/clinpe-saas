import {
  sendAppointmentNewBookingPatientEmail,
  sendAppointmentNewBookingProfessionalEmail,
} from "@/lib/email";
import {
  enqueueAppointmentNewBookingPatientEmail,
  enqueueAppointmentNewBookingProfessionalEmail,
} from "@/lib/email-queue";
import {
  createNewAppointmentNotification,
  sendNewAppointmentPushNotification,
} from "@/lib/notifications";

async function sendOrQueuePatientEmail(input: {
  tenantId: string;
  patientName: string;
  patientEmail: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
}) {
  const payload = {
    to: input.patientEmail,
    patientName: input.patientName,
    clinicName: input.clinicName,
    professionalName: input.professionalName,
    scheduledAt: input.scheduledAt,
  };

  try {
    await sendAppointmentNewBookingPatientEmail(payload);
  } catch (error) {
    try {
      await enqueueAppointmentNewBookingPatientEmail({
        tenantId: input.tenantId,
        payload,
      });
    } catch (queueError) {
      console.error("Failed to send or queue patient booking email", {
        error,
        queueError,
      });
    }
  }
}

async function sendOrQueueProfessionalEmail(input: {
  tenantId: string;
  clinicName: string;
  professionalName: string;
  professionalEmail: string;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
}) {
  const payload = {
    to: input.professionalEmail,
    clinicName: input.clinicName,
    professionalName: input.professionalName,
    scheduledAt: input.scheduledAt,
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
  };

  try {
    await sendAppointmentNewBookingProfessionalEmail(payload);
  } catch (error) {
    try {
      await enqueueAppointmentNewBookingProfessionalEmail({
        tenantId: input.tenantId,
        payload,
      });
    } catch (queueError) {
      console.error("Failed to send or queue professional booking email", {
        error,
        queueError,
      });
    }
  }
}

export async function notifyNewPublicAppointment(input: {
  tenantId: string;
  appointmentId: string;
  clinicName: string;
  professionalId: string;
  professionalName: string;
  professionalEmail: string | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  scheduledAt: string;
}) {
  const tasks: Promise<unknown>[] = [
    sendOrQueuePatientEmail({
      tenantId: input.tenantId,
      patientName: input.patientName,
      patientEmail: input.patientEmail,
      clinicName: input.clinicName,
      professionalName: input.professionalName,
      scheduledAt: input.scheduledAt,
    }),
    (async () => {
      const notification = await createNewAppointmentNotification({
        tenantId: input.tenantId,
        userId: input.professionalId,
        patientName: input.patientName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
        scheduledAt: input.scheduledAt,
        appointmentId: input.appointmentId,
      });

      await sendNewAppointmentPushNotification({
        userId: input.professionalId,
        notification,
      });
    })(),
  ];

  if (input.professionalEmail) {
    tasks.push(
      sendOrQueueProfessionalEmail({
        tenantId: input.tenantId,
        clinicName: input.clinicName,
        professionalName: input.professionalName,
        professionalEmail: input.professionalEmail,
        scheduledAt: input.scheduledAt,
        patientName: input.patientName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
