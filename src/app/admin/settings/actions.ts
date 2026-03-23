"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type HeadScript = {
  id: string;
  label: string;
  content: string;
  consent_category: "essential" | "functional" | "analytics";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ActiveHeadScript = Pick<
  HeadScript,
  "id" | "label" | "content" | "consent_category"
>;

function parseConsentCategory(value: FormDataEntryValue | null) {
  if (value === "functional" || value === "analytics") return value;
  return "essential" as const;
}

export async function getHeadScripts(): Promise<HeadScript[]> {
  await requireAdminAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("head_scripts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HeadScript[];
}

export async function createHeadScriptAction(fd: FormData) {
  await requireAdminAccess();

  const label = (fd.get("label") as string | null)?.trim() ?? "";
  const content = (fd.get("content") as string | null)?.trim() ?? "";
  const consentCategory = parseConsentCategory(fd.get("consent_category"));

  if (!content) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("O conteúdo do script é obrigatório."),
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("head_scripts")
    .insert({ label, content, consent_category: consentCategory });

  if (error) {
    redirect(
      "/admin/settings?error=" + encodeURIComponent("Erro ao salvar script."),
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect(
    "/admin/settings?success=" + encodeURIComponent("Script adicionado."),
  );
}

export async function updateHeadScriptAction(fd: FormData) {
  await requireAdminAccess();

  const id = fd.get("id") as string | null;
  const label = (fd.get("label") as string | null)?.trim() ?? "";
  const content = (fd.get("content") as string | null)?.trim() ?? "";
  const consentCategory = parseConsentCategory(fd.get("consent_category"));
  const isActive = fd.get("is_active") === "on";

  if (!id || !content) {
    redirect("/admin/settings?error=" + encodeURIComponent("Dados inválidos."));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("head_scripts")
    .update({
      label,
      content,
      consent_category: consentCategory,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Erro ao atualizar script."),
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect(
    "/admin/settings?success=" + encodeURIComponent("Script atualizado."),
  );
}

export async function deleteHeadScriptAction(fd: FormData) {
  await requireAdminAccess();

  const id = fd.get("id") as string | null;
  if (!id) {
    redirect("/admin/settings?error=" + encodeURIComponent("ID inválido."));
  }

  const admin = createAdminClient();
  const { error } = await admin.from("head_scripts").delete().eq("id", id);

  if (error) {
    redirect(
      "/admin/settings?error=" + encodeURIComponent("Erro ao excluir script."),
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings?success=" + encodeURIComponent("Script excluído."));
}

/** Called from root layout (no admin check — reads only active scripts) */
export async function getActiveHeadScripts(): Promise<ActiveHeadScript[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("head_scripts")
      .select("id, label, content, consent_category")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as ActiveHeadScript[];
  } catch {
    return [];
  }
}
