"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createSterilizationLogAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const materialName = getField(formData, "material_name");
  const sterilizedAt = getField(formData, "sterilized_at");
  const expiresAt = getField(formData, "expires_at");
  const method = getField(formData, "method");
  const cycleCode = getField(formData, "cycle_code");
  const responsibleName = getField(formData, "responsible_name");
  const notes = getField(formData, "notes");

  if (!materialName || !sterilizedAt) {
    redirect(
      "/sterilization?error=Material e data/hora de esterilizacao sao obrigatorios",
    );
  }

  const sterilizedDate = new Date(sterilizedAt);
  if (Number.isNaN(sterilizedDate.getTime())) {
    redirect("/sterilization?error=Data/hora de esterilizacao invalida");
  }

  const sterilizedAtISO = sterilizedDate.toISOString();

  const { error } = await supabase.from("sterilization_logs").insert({
    tenant_id: appUser.tenant_id,
    material_name: materialName,
    method: method || null,
    cycle_code: cycleCode || null,
    responsible_name: responsibleName || null,
    sterilized_at: sterilizedAtISO,
    expires_at: expiresAt || null,
    notes: notes || null,
  });

  if (error) {
    redirect(`/sterilization?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/sterilization");
  redirect("/sterilization?success=Registro salvo com sucesso");
}
