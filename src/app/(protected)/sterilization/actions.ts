"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getSterilizationPath(input: {
  month?: string;
  success?: string;
  error?: string;
}) {
  const search = new URLSearchParams();

  if (input.month) {
    search.set("month", input.month);
  }

  if (input.success) {
    search.set("success", input.success);
  }

  if (input.error) {
    search.set("error", input.error);
  }

  const query = search.toString();
  return query ? `/sterilization?${query}` : "/sterilization";
}

function validatePositiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function createSterilizationCycleAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const month = getField(formData, "month");
  const materialName = getField(formData, "material_name");
  const batchNumber = getField(formData, "batch_number");
  const sterilizedAt = getField(formData, "sterilized_at");
  const temperatureInput = getField(formData, "temperature_celsius");
  const pressureInput = getField(formData, "pressure_bar");
  const chemicalIndicatorStatus = getField(
    formData,
    "chemical_indicator_status",
  );
  const observations = getField(formData, "observations");

  if (!materialName || !batchNumber || !sterilizedAt) {
    redirect(
      getSterilizationPath({
        month,
        error: "Preencha os campos obrigatórios do ciclo.",
      }),
    );
  }

  const sterilizedDate = new Date(sterilizedAt);
  if (Number.isNaN(sterilizedDate.getTime())) {
    redirect(
      getSterilizationPath({
        month,
        error: "Data/hora de esterilização inválida.",
      }),
    );
  }

  const temperature = validatePositiveNumber(temperatureInput);
  const pressure = validatePositiveNumber(pressureInput);

  if (!temperature || !pressure) {
    redirect(
      getSterilizationPath({
        month,
        error: "Temperatura e pressão devem ser maiores que zero.",
      }),
    );
  }

  if (
    chemicalIndicatorStatus !== "approved" &&
    chemicalIndicatorStatus !== "rejected"
  ) {
    redirect(
      getSterilizationPath({
        month,
        error: "Informe o resultado do indicador químico.",
      }),
    );
  }

  const sterilizedAtISO = sterilizedDate.toISOString();

  const { error } = await supabase.from("sterilization_logs").insert({
    tenant_id: appUser.tenant_id,
    user_id: appUser.id,
    material_name: materialName,
    batch_number: batchNumber,
    cycle_code: batchNumber,
    temperature_celsius: temperature,
    pressure_bar: pressure,
    chemical_indicator_status: chemicalIndicatorStatus,
    method: "Autoclave",
    responsible_name: appUser.full_name,
    sterilized_at: sterilizedAtISO,
    notes: observations || null,
  });

  if (error) {
    redirect(getSterilizationPath({ month, error: error.message }));
  }

  revalidatePath("/sterilization");
  revalidatePath("/dashboard");
  redirect(
    getSterilizationPath({
      month,
      success: `Ciclo ${batchNumber} registrado com sucesso.`,
    }),
  );
}

export async function createSterilizationMaterialAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const month = getField(formData, "month");
  const name = getField(formData, "name");

  if (!name) {
    redirect(
      getSterilizationPath({
        month,
        error: "Informe o nome do material.",
      }),
    );
  }

  const { data: existing } = await supabase
    .from("materials")
    .select("id")
    .eq("tenant_id", appUser.tenant_id)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    redirect(
      getSterilizationPath({
        month,
        success: "Material já cadastrado.",
      }),
    );
  }

  const { error } = await supabase.from("materials").insert({
    tenant_id: appUser.tenant_id,
    name,
  });

  if (error) {
    redirect(getSterilizationPath({ month, error: error.message }));
  }

  revalidatePath("/sterilization");
  revalidatePath("/dashboard");
  redirect(
    getSterilizationPath({
      month,
      success: `Material ${name} cadastrado com sucesso.`,
    }),
  );
}

export async function createBiologicalTestAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const month = getField(formData, "month");
  const sterilizationLogId = getField(formData, "sterilization_log_id");
  const ampouleLot = getField(formData, "ampoule_lot");

  if (!sterilizationLogId || !ampouleLot) {
    redirect(
      getSterilizationPath({
        month,
        error: "Informe o lote do ciclo e o lote da ampola.",
      }),
    );
  }

  const { data: cycle } = await supabase
    .from("sterilization_logs")
    .select("id")
    .eq("id", sterilizationLogId)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!cycle) {
    redirect(
      getSterilizationPath({
        month,
        error: "Ciclo selecionado não encontrado.",
      }),
    );
  }

  const { error } = await supabase
    .from("sterilization_biological_tests")
    .insert({
      tenant_id: appUser.tenant_id,
      sterilization_log_id: sterilizationLogId,
      ampoule_lot: ampouleLot,
      status: "pending",
      created_by: appUser.id,
    });

  if (error) {
    redirect(getSterilizationPath({ month, error: error.message }));
  }

  revalidatePath("/sterilization");
  revalidatePath("/dashboard");
  redirect(
    getSterilizationPath({
      month,
      success: "Teste biológico iniciado (incubação pendente).",
    }),
  );
}

export async function updateBiologicalTestResultAction(formData: FormData) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const month = getField(formData, "month");
  const testId = getField(formData, "test_id");
  const result = getField(formData, "result");

  if (!testId || (result !== "approved" && result !== "rejected")) {
    redirect(
      getSterilizationPath({
        month,
        error: "Resultado de teste biológico inválido.",
      }),
    );
  }

  const { data: test } = await supabase
    .from("sterilization_biological_tests")
    .select("id")
    .eq("id", testId)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!test) {
    redirect(
      getSterilizationPath({ month, error: "Teste biológico não encontrado." }),
    );
  }

  const { error } = await supabase
    .from("sterilization_biological_tests")
    .update({
      status: result,
      read_at: new Date().toISOString(),
    })
    .eq("id", testId)
    .eq("tenant_id", appUser.tenant_id);

  if (error) {
    redirect(getSterilizationPath({ month, error: error.message }));
  }

  revalidatePath("/sterilization");
  revalidatePath("/dashboard");
  redirect(
    getSterilizationPath({
      month,
      success:
        result === "approved"
          ? "Teste biológico marcado como APROVADO."
          : "Teste biológico marcado como REPROVADO.",
    }),
  );
}
