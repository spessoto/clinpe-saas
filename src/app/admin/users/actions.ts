"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
};

export async function getAdminUsersList(): Promise<AdminUser[]> {
  // Verify current user is admin
  await requireAdminAccess();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar usuários: ${error.message}`);
  }

  return (data || []) as AdminUser[];
}

export async function toggleAdminRoleAction(formData: FormData) {
  // Verify current user is admin
  const currentAdmin = await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId || userId.length === 0) {
    redirect("/admin/users?error=ID%20de%20usuário%20inválido");
  }

  const supabase = await createClient();

  // Get current user to fetch their admin status
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    redirect("/admin/users?error=Usuário%20não%20encontrado");
  }

  const currentIsAdmin = userData.is_admin;
  const newIsAdmin = !currentIsAdmin;

  // Prevent revoking own admin status if no other admins exist
  if (currentIsAdmin && userId === currentAdmin.id) {
    // Count remaining admins
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);

    if (count === 1) {
      redirect(
        "/admin/users?error=Não%20é%20possível%20revogar%20seu%20acesso%20admin%20se%20você%20for%20o%20único%20admin",
      );
    }
  }

  // Update user's admin status
  const { error: updateError } = await supabase
    .from("users")
    .update({ is_admin: newIsAdmin })
    .eq("id", userId);

  if (updateError) {
    redirect(
      `/admin/users?error=${encodeURIComponent("Erro ao atualizar admin: " + updateError.message)}`,
    );
  }

  // Revalidate cache
  revalidatePath("/admin/users");

  // Redirect with success message
  const action = newIsAdmin ? "promovido" : "rebaixado";
  redirect(
    `/admin/users?success=${encodeURIComponent(`Usuário foi ${action} com sucesso`)}`,
  );
}
