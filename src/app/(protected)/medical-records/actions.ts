"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { optimizeImageUpload } from "@/lib/image-optimizer";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function splitCycleMaterials(materialName: string) {
  return materialName
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function withOtherReasonInArray(
  items: string[],
  otherValue: string,
  reason: string,
) {
  if (!items.includes(otherValue)) {
    return items;
  }

  if (!reason) {
    return items;
  }

  return items.map((item) =>
    item === otherValue ? `${otherValue}: ${reason}` : item,
  );
}

function withOtherReasonInSingle(value: string | null, reason: string) {
  if (value !== "Outro" || !reason) {
    return value;
  }

  return `Outro: ${reason}`;
}

export async function createMedicalRecordAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const patientId = getField(formData, "patient_id");
  const appointmentId = getField(formData, "appointment_id");
  const isReturnVisit = formData.get("is_return_visit") === "true";

  // ── A. Triagem Sistêmica ──────────────────────────────────────────
  const hasDiabetes = formData.get("has_diabetes") === "true";
  const diabetesType = getField(formData, "diabetes_type") || null;
  const diabetesOnInsulin =
    formData.get("diabetes_on_insulin") === "true"
      ? true
      : formData.get("diabetes_on_insulin") === "false"
        ? false
        : null;
  const diabetesLastGlucose =
    getField(formData, "diabetes_last_glucose") || null;
  const hasVascularIssues = formData.get("has_vascular_issues") === "true";
  const hasCoagulationDisorders =
    formData.get("has_coagulation_disorders") === "true";
  const hasOncologicalHistory =
    formData.get("has_oncological_history") === "true";
  const continuousMeds = formData
    .getAll("continuous_meds")
    .map((v) => String(v))
    .filter(Boolean);
  const continuousMedsOtherReason =
    continuousMeds.includes("Outro") ||
    continuousMeds.includes("Outro (ver obs.)")
      ? getField(formData, "continuous_meds_other_reason") || null
      : null;
  const allergies = formData
    .getAll("allergies")
    .map((v) => String(v))
    .filter(Boolean);
  const allergiesOtherReason =
    allergies.includes("Outra") || allergies.includes("Outra (ver obs.)")
      ? getField(formData, "allergies_other_reason") || null
      : null;
  const continuousMedsResolved = withOtherReasonInArray(
    continuousMeds,
    "Outro",
    continuousMedsOtherReason ?? "",
  );
  const allergiesResolved = withOtherReasonInArray(
    allergies,
    "Outra",
    allergiesOtherReason ?? "",
  );

  // ── B. Hábitos ───────────────────────────────────────────────────
  const isSmoker = formData.get("is_smoker") === "true";
  const hasSportActivity = formData.get("has_sport_activity") === "true";
  const sportType = getField(formData, "sport_type") || null;
  const predominantFootwear =
    getField(formData, "predominant_footwear") || null;
  const predominantFootwearOtherReason =
    predominantFootwear === "Outro"
      ? getField(formData, "predominant_footwear_other_reason") || null
      : null;
  const predominantFootwearResolved = withOtherReasonInSingle(
    predominantFootwear,
    predominantFootwearOtherReason ?? "",
  );

  // ── C. Exame Físico ──────────────────────────────────────────────
  const bloodPressure = getField(formData, "blood_pressure") || null;
  const capillaryGlucose = getField(formData, "capillary_glucose") || null;
  const chiefComplaint = getField(formData, "chief_complaint");
  const skinAnhydrosis = formData.get("skin_anhydrosis") === "true";
  const skinHyperhidrosis = formData.get("skin_hyperhidrosis") === "true";
  const skinTineaPedis = formData.get("skin_tinea_pedis") === "true";
  const skinPlanterWart = formData.get("skin_plantar_wart") === "true";
  const skinHyperkeratosis = formData.get("skin_hyperkeratosis") === "true";
  const hyperkeratosisLocation =
    getField(formData, "hyperkeratosis_location") || null;
  const orthHalluxValgus = formData.get("orth_hallux_valgus") === "true";
  const orthClawToes = formData.get("orth_claw_toes") === "true";
  const orthFlatFoot = formData.get("orth_flat_foot") === "true";
  const orthCavusFoot = formData.get("orth_cavus_foot") === "true";
  const nailOnychocryptosis = formData.get("nail_onychocryptosis") === "true";
  const onychocryptosisToe = getField(formData, "onychocryptosis_toe") || null;
  const onychocryptosisGranuloma =
    formData.get("onychocryptosis_granuloma") === "true"
      ? true
      : formData.get("onychocryptosis_granuloma") === "false"
        ? false
        : null;
  const nailOnychomycosis = formData.get("nail_onychomycosis") === "true";
  const nailOnycholysis = formData.get("nail_onycholysis") === "true";
  const nailOnychogryphosis = formData.get("nail_onychogryphosis") === "true";

  // ── Desfecho ─────────────────────────────────────────────────────
  const clinicalAssessment = getField(formData, "clinical_assessment") || null;
  const procedurePerformed = getField(formData, "procedure_performed");
  const recommendations = getField(formData, "recommendations");
  const evolutionNotes = getField(formData, "evolution_notes");
  const sterilizationMaterialEntriesRaw = formData
    .getAll("sterilization_material_entries")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const sterilizationLotIds = Array.from(
    new Set(
      formData
        .getAll("sterilization_lot_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  if (!patientId || !chiefComplaint) {
    redirect(
      `/medical-records/new?patient_id=${patientId}&error=Preencha os campos obrigatórios da anamnese`,
    );
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    redirect("/patients?error=Paciente inválido");
  }

  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > 4) {
    redirect(
      `/medical-records/new?patient_id=${patientId}&error=M%C3%A1ximo de 4 imagens por prontu%C3%A1rio`,
    );
  }

  const ALLOWED_MEDICAL_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const MAX_MEDICAL_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB por imagem

  for (const file of files) {
    if (!file.type || !ALLOWED_MEDICAL_IMAGE_TYPES.includes(file.type)) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent("Tipo de arquivo não permitido. Use imagens JPEG, PNG ou WebP.")}`,
      );
    }
    if (file.size > MAX_MEDICAL_IMAGE_SIZE) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent("Imagem muito grande. O tamanho máximo por imagem é 10MB.")}`,
      );
    }
  }

  if (sterilizationLotIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: selectedLots } = await supabase
      .from("sterilization_logs")
      .select(
        "id, batch_number, material_name, chemical_indicator_status, sterilized_at",
      )
      .eq("tenant_id", appUser.tenant_id)
      .in("id", sterilizationLotIds);

    if (!selectedLots || selectedLots.length !== sterilizationLotIds.length) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Lote de esterilização inválido ou fora do tenant`,
      );
    }

    const hasInvalidChemicalIndicator = selectedLots.some(
      (lot) =>
        lot.chemical_indicator_status !== "approved" &&
        lot.chemical_indicator_status !== "not_measured",
    );

    if (hasInvalidChemicalIndicator) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Somente lotes com indicador químico aprovado ou não aferido podem ser vinculados`,
      );
    }

    const hasOldLot = selectedLots.some(
      (lot) => new Date(lot.sterilized_at).getTime() < cutoff.getTime(),
    );

    if (hasOldLot) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Selecione apenas lotes válidos dos últimos 30 dias`,
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
        `/medical-records/new?patient_id=${patientId}&error=Um dos lotes selecionados foi reprovado no teste biológico e não pode ser utilizado`,
      );
    }

    const lotById = new Map(selectedLots.map((lot) => [lot.id, lot]));
    const parsedMaterialEntries = sterilizationMaterialEntriesRaw.flatMap(
      (raw) => {
        try {
          const parsed = JSON.parse(raw) as {
            lotId?: string;
            material?: string;
          };
          if (!parsed.lotId || !parsed.material) {
            return [];
          }

          return [{ lotId: parsed.lotId, material: parsed.material.trim() }];
        } catch {
          return [];
        }
      },
    );

    const sanitizedMaterialEntries = parsedMaterialEntries.flatMap((entry) => {
      const lot = lotById.get(entry.lotId);
      if (!lot) {
        return [];
      }

      const lotMaterials = splitCycleMaterials(lot.material_name ?? "");
      const isKnownMaterial =
        lotMaterials.length === 0 || lotMaterials.includes(entry.material);

      if (!isKnownMaterial) {
        return [];
      }

      return [
        {
          lot_id: lot.id,
          batch_number: lot.batch_number,
          material: entry.material,
        },
      ];
    });

    if (
      sterilizationMaterialEntriesRaw.length > 0 &&
      sanitizedMaterialEntries.length === 0
    ) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=Seleção de materiais de rastreabilidade inválida`,
      );
    }

    formData.set(
      "sterilization_material_entries_sanitized",
      JSON.stringify(sanitizedMaterialEntries),
    );
  }

  const uploadedPaths: string[] = [];

  for (const file of files) {
    const optimizedImage = await optimizeImageUpload(file, {
      maxWidth: 2400,
      maxHeight: 2400,
      quality: 86,
    });
    const path = `${appUser.tenant_id}/${patientId}/${Date.now()}-${randomUUID()}-${optimizedImage.fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("medical-record-images")
      .upload(path, optimizedImage.bytes, {
        contentType: optimizedImage.contentType,
        upsert: false,
      });

    if (uploadError) {
      redirect(
        `/medical-records/new?patient_id=${patientId}&error=${encodeURIComponent(uploadError.message)}`,
      );
    }

    uploadedPaths.push(path);
  }

  const { data: created, error } = await supabase
    .from("medical_records")
    .insert({
      tenant_id: appUser.tenant_id,
      patient_id: patientId,
      appointment_id: appointmentId || null,
      anamnesis_data: {
        is_return_visit: isReturnVisit,
        // A — Triagem Sistêmica
        has_diabetes: hasDiabetes,
        diabetes_type: diabetesType,
        diabetes_on_insulin: diabetesOnInsulin,
        diabetes_last_glucose: diabetesLastGlucose,
        has_vascular_issues: hasVascularIssues,
        has_coagulation_disorders: hasCoagulationDisorders,
        has_oncological_history: hasOncologicalHistory,
        continuous_meds: continuousMedsResolved,
        continuous_meds_other_reason: continuousMedsOtherReason,
        allergies: allergiesResolved,
        allergies_other_reason: allergiesOtherReason,
        // B — Hábitos
        is_smoker: isSmoker,
        has_sport_activity: hasSportActivity,
        sport_type: sportType,
        predominant_footwear: predominantFootwearResolved,
        predominant_footwear_other_reason: predominantFootwearOtherReason,
        // C — Exame Físico
        blood_pressure: bloodPressure,
        capillary_glucose: capillaryGlucose,
        chief_complaint: chiefComplaint,
        skin_anhydrosis: skinAnhydrosis,
        skin_hyperhidrosis: skinHyperhidrosis,
        skin_tinea_pedis: skinTineaPedis,
        skin_plantar_wart: skinPlanterWart,
        skin_hyperkeratosis: skinHyperkeratosis,
        hyperkeratosis_location: hyperkeratosisLocation,
        orth_hallux_valgus: orthHalluxValgus,
        orth_claw_toes: orthClawToes,
        orth_flat_foot: orthFlatFoot,
        orth_cavus_foot: orthCavusFoot,
        nail_onychocryptosis: nailOnychocryptosis,
        onychocryptosis_toe: onychocryptosisToe,
        onychocryptosis_granuloma: onychocryptosisGranuloma,
        nail_onychomycosis: nailOnychomycosis,
        nail_onycholysis: nailOnycholysis,
        nail_onychogryphosis: nailOnychogryphosis,
        // Desfecho
        clinical_assessment: clinicalAssessment,
        procedure_performed: procedurePerformed,
        recommendations,
        evolution_notes: evolutionNotes,
        sterilization_materials_used: JSON.parse(
          getField(formData, "sterilization_material_entries_sanitized") ||
            "[]",
        ),
      },
      photos: uploadedPaths,
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

  // Modelo híbrido: atualizar dado mestre do paciente com o estado de saúde confirmado na consulta
  await supabase
    .from("patients")
    .update({
      has_diabetes: hasDiabetes,
      diabetes_type: diabetesType,
      diabetes_on_insulin: diabetesOnInsulin,
      has_vascular_issues: hasVascularIssues,
      has_coagulation_disorders: hasCoagulationDisorders,
      has_oncological_history: hasOncologicalHistory,
      continuous_meds: continuousMedsResolved,
      patient_allergies: allergiesResolved,
      is_smoker: isSmoker,
    })
    .eq("id", patientId)
    .eq("tenant_id", appUser.tenant_id);

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  redirect(`/medical-records/${created.id}`);
}
