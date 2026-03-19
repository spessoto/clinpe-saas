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
  const sterilizationLotIds = formData
    .getAll("sterilization_lot_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

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

  if (sterilizationLotIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: selectedLots } = await supabase
      .from("sterilization_logs")
      .select("id, chemical_indicator_status, sterilized_at")
      .eq("tenant_id", appUser.tenant_id)
      .in("id", sterilizationLotIds);

    if (!selectedLots || selectedLots.length !== sterilizationLotIds.length) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Lote de esterilizacao invalido ou fora do tenant`,
      );
    }

    const hasInvalidChemicalIndicator = selectedLots.some(
      (lot) => lot.chemical_indicator_status !== "approved",
    );

    if (hasInvalidChemicalIndicator) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Somente lotes com indicador quimico aprovado podem ser vinculados`,
      );
    }

    const hasOldLot = selectedLots.some(
      (lot) => new Date(lot.sterilized_at).getTime() < cutoff.getTime(),
    );

    if (hasOldLot) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Selecione apenas lotes validos dos ultimos 30 dias`,
      );
    }

    const { data: rejectedTests } = await supabase
      .from("sterilization_biological_tests")
      .select("id")
      .eq("tenant_id", appUser.tenant_id)
      .eq("status", "rejected")
      .in("sterilization_log_id", sterilizationLotIds)
      .limit(1);

    if ((rejectedTests ?? []).length > 0) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Um dos lotes selecionados foi reprovado no teste biologico e nao pode ser utilizado`,
      );
    }
  }

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
      `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent(error?.message ?? "Falha ao salvar prontuário")}`,
    );
  }

  if (sterilizationLotIds.length > 0) {
    const rows = sterilizationLotIds.map((lotId) => ({
      tenant_id: appUser.tenant_id,
      medical_record_id: created.id,
      sterilization_log_id: lotId,
    }));

    const { error: linkError } = await supabase
      .from("medical_record_sterilization_lots")
      .insert(rows);

    if (linkError) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent(linkError.message)}`,
      );
    }
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  redirect(`/medical-records/${created.id}`);
}
