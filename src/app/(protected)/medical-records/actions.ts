"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function toSafeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export async function createMedicalRecordAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const patientId = getField(formData, "patient_id");
  const appointmentId = getField(formData, "appointment_id");

  const chiefComplaint = getField(formData, "chief_complaint");
  const clinicalAssessment = getField(formData, "clinical_assessment");
  const procedurePerformed = getField(formData, "procedure_performed");
  const recommendations = getField(formData, "recommendations");
  const evolutionNotes = getField(formData, "evolution_notes");

  if (!patientId || !chiefComplaint || !clinicalAssessment) {
    redirect(
      `/medical-records/new?patient_id=${patientId}&error=Preencha os campos obrigatorios da anamnese`,
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    redirect("/patients?error=Paciente invalido");
  }

  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const safeName = toSafeFileName(file.name || "image");
    const path = `${appUser.tenant_id}/${patientId}/${Date.now()}-${randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("medical-images")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent(uploadError.message)}`,
      );
    }

    const { data: publicData } = supabase.storage
      .from("medical-images")
      .getPublicUrl(path);

    uploadedUrls.push(publicData.publicUrl);
  }

  const { data: created, error } = await supabase
    .from("medical_records")
    .insert({
      tenant_id: appUser.tenant_id,
      patient_id: patientId,
      appointment_id: appointmentId || null,
      anamnesis_data: {
        chief_complaint: chiefComplaint,
        clinical_assessment: clinicalAssessment,
        procedure_performed: procedurePerformed,
        recommendations,
        evolution_notes: evolutionNotes,
      },
      photos: uploadedUrls,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(
      `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent(error?.message ?? "Falha ao salvar prontuario")}`,
    );
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  redirect(`/medical-records/${created.id}`);
}
