"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
