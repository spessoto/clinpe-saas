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

function parseDateInput(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return value;
}

function parseCsvLine(line: string, delimiter = ",") {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvAmount(value: string) {
  return parseAmount(value.replace(/;/g, ","));
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

export async function createRecurringFinancialTransactionAction(
  formData: FormData,
) {
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
  const frequency = getField(formData, "frequency");
  const nextOccurrenceOn = getField(formData, "next_occurrence_on");

  if (!type || (type !== "income" && type !== "expense")) {
    redirect("/finance?error=Tipo recorrente inválido");
  }

  const amount = parseAmount(amountInput);
  if (!amount) {
    redirect("/finance?error=Informe um valor recorrente válido");
  }

  if (!isValidFinancialCategory(category)) {
    redirect("/finance?error=Selecione uma categoria válida");
  }

  if (frequency !== "weekly" && frequency !== "monthly") {
    redirect("/finance?error=Frequência recorrente inválida");
  }

  if (!parseDateInput(nextOccurrenceOn)) {
    redirect("/finance?error=Informe uma próxima data válida");
  }

  const { error } = await supabase
    .from("recurring_financial_transactions")
    .insert({
      tenant_id: appUser.tenant_id,
      type,
      amount,
      category,
      description: description || null,
      payment_method: paymentMethod || null,
      frequency,
      next_occurrence_on: nextOccurrenceOn,
    });

  if (error) {
    redirect(`/finance?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/finance");
  redirect("/finance?success=Lancamento recorrente criado");
}

export async function toggleRecurringFinancialTransactionAction(
  formData: FormData,
) {
  const { appUser } = await requireOwnerPlanCapability(
    "finance",
    "O módulo Financeiro está disponível apenas nos planos Pro e Clínica.",
  );
  const supabase = await createClient();

  const id = getField(formData, "id");
  const active = getField(formData, "active") === "true";
  if (!id) {
    redirect("/finance?error=Lancamento recorrente inválido");
  }

  const { error } = await supabase
    .from("recurring_financial_transactions")
    .update({ active })
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect(`/finance?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/finance");
}

export async function importFinancialCsvAction(formData: FormData) {
  const { appUser } = await requireOwnerPlanCapability(
    "finance",
    "O módulo Financeiro está disponível apenas nos planos Pro e Clínica.",
  );
  const supabase = await createClient();

  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/finance?error=Selecione um arquivo CSV para importar");
  }

  const rawContent = await file.text();
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    redirect("/finance?error=CSV sem linhas de dados");
  }

  const rows = lines.slice(1);
  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const entries: Array<{
    tenant_id: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    description: string | null;
    payment_method: string | null;
    occurred_on: string;
  }> = [];

  let failedRows = 0;

  for (const row of rows) {
    const [occurredOn, typeRaw, categoryRaw, descriptionRaw, paymentRaw, amountRaw] =
      parseCsvLine(row, delimiter);

    const type =
      typeRaw === "income" || typeRaw === "Entrada"
        ? "income"
        : typeRaw === "expense" || typeRaw === "Saída"
          ? "expense"
          : null;

    const amount = parseCsvAmount(amountRaw ?? "");
    const category = (categoryRaw || "").trim();

    if (
      !type ||
      !amount ||
      !parseDateInput(occurredOn || "") ||
      !isValidFinancialCategory(category)
    ) {
      failedRows += 1;
      continue;
    }

    entries.push({
      tenant_id: appUser.tenant_id,
      type,
      amount,
      category,
      description: descriptionRaw?.trim() ? descriptionRaw.trim() : null,
      payment_method: paymentRaw?.trim() ? paymentRaw.trim() : null,
      occurred_on: occurredOn,
    });
  }

  if (entries.length > 0) {
    const { error: insertError } = await supabase
      .from("financial_transactions")
      .insert(entries);

    if (insertError) {
      redirect(`/finance?error=${encodeURIComponent(insertError.message)}`);
    }
  }

  await supabase.from("financial_import_batches").insert({
    tenant_id: appUser.tenant_id,
    source: "csv",
    status: "completed",
    imported_rows: entries.length,
    failed_rows: failedRows,
    created_by: appUser.id,
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  redirect(
    `/finance?success=${encodeURIComponent(`Importacao concluida: ${entries.length} linha(s) importada(s), ${failedRows} com erro`)}`,
  );
}
