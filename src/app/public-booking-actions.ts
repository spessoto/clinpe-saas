"use server";

import { redirect } from "next/navigation";

import { createPublicBooking } from "@/lib/booking";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createPublicBookingAction(formData: FormData) {
  const tenantSlug = getField(formData, "tenant_slug");
  const returnPath = getField(formData, "return_path");
  const professionalId = getField(formData, "professional_id");
  const scheduledAt = getField(formData, "scheduled_at");
  const patientName = getField(formData, "patient_name");
  const patientEmail = getField(formData, "patient_email");
  const patientPhone = getField(formData, "patient_phone");
  const recaptchaToken = getField(formData, "recaptcha_token");
  const basePath = returnPath || `/booking-pages/${tenantSlug}`;

  if (
    !tenantSlug ||
    !professionalId ||
    !scheduledAt ||
    !patientName ||
    !patientEmail ||
    !patientPhone
  ) {
    redirect(`${basePath}?error=Preencha os dados e escolha um horário`);
  }

  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    redirect(
      `${basePath}?error=Verificação de segurança falhou. Tente novamente.`,
    );
  }

  try {
    await createPublicBooking({
      tenantSlug,
      professionalId,
      scheduledAt,
      patientName,
      patientEmail,
      patientPhone,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao agendar consulta";
    redirect(`${basePath}?error=${encodeURIComponent(message)}`);
  }

  redirect(`${basePath}?success=Consulta agendada com sucesso`);
}
