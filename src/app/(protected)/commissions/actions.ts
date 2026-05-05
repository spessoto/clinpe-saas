"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwnerPlanCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCommissionAction(formData: FormData) {
  const { appUser } = await requireOwnerPlanCapability(
    "commissions",
    "O módulo de Comissões está disponível apenas no plano Clínica.",
  );
  const supabase = await createClient();

  const professionalName = getField(formData, "professional_name");
  const serviceDescription = getField(formData, "service_description") || null;
  const amount = parseFloat(getField(formData, "amount"));
  const commissionRate = parseFloat(getField(formData, "commission_rate"));
  const serviceDate = getField(formData, "service_date");
  const notes = getField(formData, "notes") || null;

  if (
    !professionalName ||
    isNaN(amount) ||
    isNaN(commissionRate) ||
    !serviceDate
  ) {
    redirect(
      "/commissions/new?error=" +
        encodeURIComponent(
          "Preencha profissional, valor, taxa e data do serviço.",
        ),
    );
  }

  const commissionAmount =
    Math.round(((amount * commissionRate) / 100) * 100) / 100;

  const { error } = await supabase.from("commissions").insert({
    tenant_id: appUser.tenant_id,
    professional_name: professionalName,
    service_description: serviceDescription,
    amount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    service_date: serviceDate,
    notes,
    created_by: appUser.id,
  });

  if (error) {
    redirect("/commissions/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/commissions");
  redirect("/commissions");
}

export async function markCommissionPaidAction(formData: FormData) {
  const { appUser } = await requireOwnerPlanCapability(
    "commissions",
    "O módulo de Comissões está disponível apenas no plano Clínica.",
  );
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { error } = await supabase
    .from("commissions")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect("/commissions?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/commissions");
}

export async function deleteCommissionAction(formData: FormData) {
  const { appUser } = await requireOwnerPlanCapability(
    "commissions",
    "O módulo de Comissões está disponível apenas no plano Clínica.",
  );
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await supabase
    .from("commissions")
    .delete()
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  revalidatePath("/commissions");
}
