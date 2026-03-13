"use server";

import { redirect } from "next/navigation";

import { createPublicBooking } from "@/lib/booking";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createPublicBookingAction(formData: FormData) {
  const tenantSlug = getField(formData, "tenant_slug");
  const professionalId = getField(formData, "professional_id");
  const scheduledAt = getField(formData, "scheduled_at");
  const patientName = getField(formData, "patient_name");
  const patientPhone = getField(formData, "patient_phone");

  if (
    !tenantSlug ||
    !professionalId ||
    !scheduledAt ||
    !patientName ||
    !patientPhone
  ) {
    redirect(
      `/${tenantSlug}/book?error=Preencha os dados e escolha um horario`,
    );
  }

  try {
    await createPublicBooking({
      tenantSlug,
      professionalId,
      scheduledAt,
      patientName,
      patientPhone,
    });

    redirect(`/${tenantSlug}/book?success=Consulta agendada com sucesso`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao agendar consulta";
    redirect(`/${tenantSlug}/book?error=${encodeURIComponent(message)}`);
  }
}
