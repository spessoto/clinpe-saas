"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwnerPlanCapability } from "@/lib/auth";
import { isValidFinancialCategory } from "@/lib/finance-categories";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseAmount(value: string) {
  const compact = value.replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact.replace(/,/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export async function createFinancialTransactionAction(formData: FormData) {
  const { appUser } = await requireOwnerPlanCapability(
    "finance",
    "O módulo Financeiro está disponível apenas nos planos Pro e Clínica.",
  );
  const supabase = await createClient();

  const type = getField(formData, "type");
  const amountInput = getField(formData, "amount");
  const category = getField(formData, "category");
  const description = getField(formData, "description");
  const paymentMethod = getField(formData, "payment_method");
  const occurredOn = getField(formData, "occurred_on");

  if (!type || (type !== "income" && type !== "expense")) {
    redirect("/finance?error=Tipo de transacao invalido");
  }

  const amount = parseAmount(amountInput);
  if (!amount) {
    redirect("/finance?error=Informe um valor valido");
  }

  if (!occurredOn) {
    redirect("/finance?error=Informe a data da transacao");
  }

  if (!isValidFinancialCategory(category)) {
    redirect("/finance?error=Selecione uma categoria valida");
  }

  const { error } = await supabase.from("financial_transactions").insert({
    tenant_id: appUser.tenant_id,
    type,
    amount,
    category,
    description: description || null,
    payment_method: paymentMethod || null,
    occurred_on: occurredOn,
  });

  if (error) {
    redirect(`/finance?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  redirect("/finance?success=Transacao registrada com sucesso");
}
