"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

  if (!id || !name || !phone) {
    redirect(`/patients/${id || ""}/edit?error=Campos invalidos`);
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name,
      phone,
      birth_date: birthDate || null,
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
