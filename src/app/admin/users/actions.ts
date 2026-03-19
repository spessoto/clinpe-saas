"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
};

const ADMIN_USERS_PAGE_SIZE = 50;

type AdminUsersListResult = {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getAdminUsersList(
  page = 1,
): Promise<AdminUsersListResult> {
  // Verify current user is admin
  await requireAdminAccess();

  const supabase = await createClient();
  const currentPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (currentPage - 1) * ADMIN_USERS_PAGE_SIZE;
  const to = from + ADMIN_USERS_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("users")
    .select("id, email, full_name, is_admin, created_at", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar usuários: ${error.message}`);
  }

  const users = (data || []) as AdminUser[];
  const resolvedCount = typeof count === "number" ? count : users.length;
  const totalPages = Math.max(
    1,
    Math.ceil(resolvedCount / ADMIN_USERS_PAGE_SIZE),
  );

  return {
    users,
    totalCount: resolvedCount,
    page: currentPage,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    totalPages,
  };
}

export async function toggleAdminRoleAction(formData: FormData) {
  // Verify current user is admin
  const currentAdmin = await requireAdminAccess();

  const userId = String(formData.get("userId") ?? "").trim();
  const currentPage = Math.max(
    1,
    Number.parseInt(String(formData.get("page") ?? "1"), 10) || 1,
  );
  const pageQuery = `page=${currentPage}`;
  if (!userId || userId.length === 0) {
    redirect(`/admin/users?${pageQuery}&error=ID%20de%20usuário%20inválido`);
  }

  const supabase = await createClient();

  // Get current user to fetch their admin status
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    redirect(`/admin/users?${pageQuery}&error=Usuário%20não%20encontrado`);
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
        `/admin/users?${pageQuery}&error=Não%20é%20possível%20revogar%20seu%20acesso%20admin%20se%20você%20for%20o%20único%20admin`,
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
      `/admin/users?${pageQuery}&error=${encodeURIComponent("Erro ao atualizar admin: " + updateError.message)}`,
    );
  }

  // Revalidate cache
  revalidatePath("/admin/users");

  // Redirect with success message
  const action = newIsAdmin ? "promovido" : "rebaixado";
  redirect(
    `/admin/users?${pageQuery}&success=${encodeURIComponent(`Usuário foi ${action} com sucesso`)}`,
  );
}
