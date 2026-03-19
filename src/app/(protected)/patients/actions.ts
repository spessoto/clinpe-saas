"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { buildHealthAlerts } from "@/lib/health-alerts";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "true";
}

function getMultiSelect(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((v) => String(v))
    .filter(Boolean);
}

export type PatientLimitStatus = {
  current: number;
  max: number;
  isLimitReached: boolean;
  remainingSlots: number;
};

export async function getPatientCountStatus(): Promise<PatientLimitStatus> {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    console.error("Erro ao contar pacientes:", error);
    return {
      current: 0,
      max: tenant.max_patients_allowed,
      isLimitReached: false,
      remainingSlots: tenant.max_patients_allowed,
    };
  }

  const currentCount = count ?? 0;
  const isLimitReached = currentCount >= tenant.max_patients_allowed;

  return {
    current: currentCount,
    max: tenant.max_patients_allowed,
    isLimitReached,
    remainingSlots: Math.max(0, tenant.max_patients_allowed - currentCount),
  };
}

export async function createPatientAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const name = getField(formData, "name");
  const phone = getField(formData, "phone");
  const birthDate = getField(formData, "birth_date");
  const cpf = getField(formData, "cpf");
  const rg = getField(formData, "rg");
  const email = getField(formData, "email");
  const addressStreet = getField(formData, "address_street");
  const addressNeighborhood = getField(formData, "address_neighborhood");
  const addressZipcode = getField(formData, "address_zipcode");
  const occupation = getField(formData, "occupation");
  const emergencyContactName = getField(formData, "emergency_contact_name");
  const emergencyContactPhone = getField(formData, "emergency_contact_phone");
  const referralSource = getField(formData, "referral_source");
  // Saúde
  const hasDiabetes = getCheckbox(formData, "has_diabetes");
  const diabetesType = getField(formData, "diabetes_type") || null;
  const diabetesOnInsulin =
    formData.get("diabetes_on_insulin") === "true"
      ? true
      : formData.get("diabetes_on_insulin") === "false"
        ? false
        : null;
  const hasVascularIssues = getCheckbox(formData, "has_vascular_issues");
  const hasCoagulationDisorders = getCheckbox(
    formData,
    "has_coagulation_disorders",
  );
  const hasOncologicalHistory = getCheckbox(
    formData,
    "has_oncological_history",
  );
  const continuousMeds = getMultiSelect(formData, "continuous_meds");
  const patientAllergies = getMultiSelect(formData, "patient_allergies");
  const isSmoker = getCheckbox(formData, "is_smoker");
  const predominantFootwear =
    getField(formData, "predominant_footwear") || null;

  const healthAlerts = buildHealthAlerts({
    has_diabetes: hasDiabetes,
    diabetes_type: diabetesType,
    has_vascular_issues: hasVascularIssues,
    has_coagulation_disorders: hasCoagulationDisorders,
    has_oncological_history: hasOncologicalHistory,
    is_smoker: isSmoker,
    continuous_meds: continuousMeds,
    patient_allergies: patientAllergies,
  });

  if (!name || !phone) {
    redirect("/patients/new?error=Nome e telefone sao obrigatorios");
  }

  // Verificar limite de pacientes
  const limitStatus = await getPatientCountStatus();
  if (limitStatus.isLimitReached) {
    redirect(
      `/patients/new?error=Limite de pacientes atingido (${limitStatus.current}/${limitStatus.max}). Faça upgrade para adicionar mais.&limitReached=true`,
    );
  }

  const { error } = await supabase.from("patients").insert({
    tenant_id: appUser.tenant_id,
    name,
    phone,
    birth_date: birthDate || null,
    cpf: cpf || null,
    rg: rg || null,
    email: email || null,
    address_street: addressStreet || null,
    address_neighborhood: addressNeighborhood || null,
    address_zipcode: addressZipcode || null,
    occupation: occupation || null,
    emergency_contact_name: emergencyContactName || null,
    emergency_contact_phone: emergencyContactPhone || null,
    referral_source: referralSource || null,
    has_diabetes: hasDiabetes,
    diabetes_type: diabetesType,
    diabetes_on_insulin: diabetesOnInsulin,
    has_vascular_issues: hasVascularIssues,
    has_coagulation_disorders: hasCoagulationDisorders,
    has_oncological_history: hasOncologicalHistory,
    continuous_meds: continuousMeds,
    patient_allergies: patientAllergies,
    is_smoker: isSmoker,
    predominant_footwear: predominantFootwear,
    health_alerts: healthAlerts,
  });

  if (error) {
    redirect(`/patients/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect("/patients");
}

export async function updatePatientAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const id = getField(formData, "id");
  const name = getField(formData, "name");
  const phone = getField(formData, "phone");
  const birthDate = getField(formData, "birth_date");
  const cpf = getField(formData, "cpf");
  const rg = getField(formData, "rg");
  const email = getField(formData, "email");
  const addressStreet = getField(formData, "address_street");
  const addressNeighborhood = getField(formData, "address_neighborhood");
  const addressZipcode = getField(formData, "address_zipcode");
  const occupation = getField(formData, "occupation");
  const emergencyContactName = getField(formData, "emergency_contact_name");
  const emergencyContactPhone = getField(formData, "emergency_contact_phone");
  const referralSource = getField(formData, "referral_source");
  // Saúde
  const hasDiabetes = getCheckbox(formData, "has_diabetes");
  const diabetesType = getField(formData, "diabetes_type") || null;
  const diabetesOnInsulin =
    formData.get("diabetes_on_insulin") === "true"
      ? true
      : formData.get("diabetes_on_insulin") === "false"
        ? false
        : null;
  const hasVascularIssues = getCheckbox(formData, "has_vascular_issues");
  const hasCoagulationDisorders = getCheckbox(
    formData,
    "has_coagulation_disorders",
  );
  const hasOncologicalHistory = getCheckbox(
    formData,
    "has_oncological_history",
  );
  const continuousMeds = getMultiSelect(formData, "continuous_meds");
  const patientAllergies = getMultiSelect(formData, "patient_allergies");
  const isSmoker = getCheckbox(formData, "is_smoker");
  const predominantFootwear =
    getField(formData, "predominant_footwear") || null;

  const healthAlerts = buildHealthAlerts({
    has_diabetes: hasDiabetes,
    diabetes_type: diabetesType,
    has_vascular_issues: hasVascularIssues,
    has_coagulation_disorders: hasCoagulationDisorders,
    has_oncological_history: hasOncologicalHistory,
    is_smoker: isSmoker,
    continuous_meds: continuousMeds,
    patient_allergies: patientAllergies,
  });

  if (!id || !name || !phone) {
    redirect(`/patients/${id || ""}/edit?error=Campos invalidos`);
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name,
      phone,
      birth_date: birthDate || null,
      cpf: cpf || null,
      rg: rg || null,
      email: email || null,
      address_street: addressStreet || null,
      address_neighborhood: addressNeighborhood || null,
      address_zipcode: addressZipcode || null,
      occupation: occupation || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      referral_source: referralSource || null,
      has_diabetes: hasDiabetes,
      diabetes_type: diabetesType,
      diabetes_on_insulin: diabetesOnInsulin,
      has_vascular_issues: hasVascularIssues,
      has_coagulation_disorders: hasCoagulationDisorders,
      has_oncological_history: hasOncologicalHistory,
      continuous_meds: continuousMeds,
      patient_allergies: patientAllergies,
      is_smoker: isSmoker,
      predominant_footwear: predominantFootwear,
      health_alerts: healthAlerts,
    })
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect(`/patients/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  redirect(`/patients/${id}`);
}

export async function deletePatientAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const id = getField(formData, "id");

  if (!id) {
    redirect("/patients?error=Paciente invalido");
  }

  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect(`/patients/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect("/patients");
}
