"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  BILLING_PLANS,
  type BillingTier,
} from "@/app/(protected)/billing/plans";
import { requireActiveTenant } from "@/lib/auth";
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

function isMissingReferralSourceColumnError(
  error: { message?: string } | null,
) {
  if (!error?.message) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("referral_source") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("pgrst204"))
  );
}

export type PatientLimitStatus = {
  current: number;
  max: number;
  isLimitReached: boolean;
  remainingSlots: number;
  overagePatients: number;
  overageMonthlyAmount: number | null;
};

function getCurrentMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  return { start, end };
}

async function syncMonthlyPatientUsage(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  tenantId: string;
  billingTier: "free_trial" | BillingTier;
  maxPatientsAllowed: number;
  nextCount: number;
}) {
  const { start, end } = getCurrentMonthBounds();
  const overagePatients = Math.max(
    0,
    input.nextCount - input.maxPatientsAllowed,
  );

  const { data: existing } = await input.supabase
    .from("patient_overage_usage_monthly")
    .select("peak_patients")
    .eq("tenant_id", input.tenantId)
    .eq("billing_period_start", start)
    .maybeSingle();

  const planTier =
    input.billingTier === "free_trial" ? null : input.billingTier;
  const peakPatients = Math.max(existing?.peak_patients ?? 0, input.nextCount);
  const overageSlotAmount = planTier
    ? BILLING_PLANS[planTier].overageMonthlyAmount
    : null;

  const { error } = await input.supabase
    .from("patient_overage_usage_monthly")
    .upsert(
      {
        tenant_id: input.tenantId,
        billing_period_start: start,
        billing_period_end: end,
        plan_tier: input.billingTier,
        included_patients: input.maxPatientsAllowed,
        peak_patients: peakPatients,
        overage_patients: overagePatients,
        overage_slot_amount: overageSlotAmount,
      },
      { onConflict: "tenant_id,billing_period_start" },
    );

  if (error) {
    console.error("Erro ao sincronizar uso mensal de pacientes:", error);
  }
}

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
      overagePatients: 0,
      overageMonthlyAmount: 0,
    };
  }

  const currentCount = count ?? 0;
  const isLimitReached = currentCount >= tenant.max_patients_allowed;
  const overagePatients = Math.max(
    0,
    currentCount - tenant.max_patients_allowed,
  );
  const overageAmount =
    tenant.billing_tier !== "free_trial"
      ? BILLING_PLANS[tenant.billing_tier]?.overageMonthlyAmount
      : null;

  return {
    current: currentCount,
    max: tenant.max_patients_allowed,
    isLimitReached,
    remainingSlots: Math.max(0, tenant.max_patients_allowed - currentCount),
    overagePatients,
    overageMonthlyAmount: overageAmount ?? null,
  };
}

export async function createPatientAction(formData: FormData) {
  const { appUser, tenant } = await requireActiveTenant();
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
  const referralSource = getField(formData, "referral_source") || null;
  const continuousMedsOtherReason = getField(
    formData,
    "continuous_meds_other_reason",
  );
  const patientAllergiesOtherReason = getField(
    formData,
    "patient_allergies_other_reason",
  );
  const predominantFootwearOtherReason = getField(
    formData,
    "predominant_footwear_other_reason",
  );
  const referralSourceOtherReason = getField(
    formData,
    "referral_source_other_reason",
  );

  const continuousMedsResolved = withOtherReasonInArray(
    continuousMeds,
    "Outro",
    continuousMedsOtherReason,
  );
  const patientAllergiesResolved = withOtherReasonInArray(
    patientAllergies,
    "Outra",
    patientAllergiesOtherReason,
  );
  const predominantFootwearResolved = withOtherReasonInSingle(
    predominantFootwear,
    predominantFootwearOtherReason,
  );
  const referralSourceResolved = withOtherReasonInSingle(
    referralSource,
    referralSourceOtherReason,
  );

  if (!name || !phone) {
    redirect("/patients/new?error=Nome e telefone sao obrigatorios");
  }

  const limitStatus = await getPatientCountStatus();

  const insertPayload = {
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
    has_diabetes: hasDiabetes,
    diabetes_type: diabetesType,
    diabetes_on_insulin: diabetesOnInsulin,
    has_vascular_issues: hasVascularIssues,
    has_coagulation_disorders: hasCoagulationDisorders,
    has_oncological_history: hasOncologicalHistory,
    continuous_meds: continuousMedsResolved,
    patient_allergies: patientAllergiesResolved,
    is_smoker: isSmoker,
    predominant_footwear: predominantFootwearResolved,
    referral_source: referralSourceResolved,
  };

  let { error } = await supabase.from("patients").insert(insertPayload);

  if (isMissingReferralSourceColumnError(error)) {
    const { referral_source: _, ...legacyPayload } = insertPayload;
    const legacyInsert = await supabase.from("patients").insert(legacyPayload);
    error = legacyInsert.error;
  }

  if (error) {
    redirect(`/patients/new?error=${encodeURIComponent(error.message)}`);
  }

  const { count: committedCount, error: committedCountError } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id);

  const nextCount = committedCountError
    ? limitStatus.current + 1
    : (committedCount ?? limitStatus.current + 1);

  await syncMonthlyPatientUsage({
    supabase,
    tenantId: appUser.tenant_id,
    billingTier: tenant.billing_tier,
    maxPatientsAllowed: tenant.max_patients_allowed,
    nextCount,
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  revalidatePath("/billing");
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
  const referralSource = getField(formData, "referral_source") || null;
  const continuousMedsOtherReason = getField(
    formData,
    "continuous_meds_other_reason",
  );
  const patientAllergiesOtherReason = getField(
    formData,
    "patient_allergies_other_reason",
  );
  const predominantFootwearOtherReason = getField(
    formData,
    "predominant_footwear_other_reason",
  );
  const referralSourceOtherReason = getField(
    formData,
    "referral_source_other_reason",
  );

  const continuousMedsResolved = withOtherReasonInArray(
    continuousMeds,
    "Outro",
    continuousMedsOtherReason,
  );
  const patientAllergiesResolved = withOtherReasonInArray(
    patientAllergies,
    "Outra",
    patientAllergiesOtherReason,
  );
  const predominantFootwearResolved = withOtherReasonInSingle(
    predominantFootwear,
    predominantFootwearOtherReason,
  );
  const referralSourceResolved = withOtherReasonInSingle(
    referralSource,
    referralSourceOtherReason,
  );

  if (!id || !name || !phone) {
    redirect(`/patients/${id || ""}/edit?error=Campos invalidos`);
  }

  const updatePayload = {
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
    has_diabetes: hasDiabetes,
    diabetes_type: diabetesType,
    diabetes_on_insulin: diabetesOnInsulin,
    has_vascular_issues: hasVascularIssues,
    has_coagulation_disorders: hasCoagulationDisorders,
    has_oncological_history: hasOncologicalHistory,
    continuous_meds: continuousMedsResolved,
    patient_allergies: patientAllergiesResolved,
    is_smoker: isSmoker,
    predominant_footwear: predominantFootwearResolved,
    referral_source: referralSourceResolved,
  };

  const updateQuery = supabase
    .from("patients")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  let { error } = await updateQuery;

  if (isMissingReferralSourceColumnError(error)) {
    const { referral_source: _, ...legacyPayload } = updatePayload;
    const legacyUpdate = await supabase
      .from("patients")
      .update(legacyPayload)
      .eq("id", id)
      .eq("tenant_id", appUser.tenant_id);

    error = legacyUpdate.error;
  }

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
