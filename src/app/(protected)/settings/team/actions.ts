"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTier3Owner } from "@/lib/auth";
import { sendStaffInviteEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_STAFF = 9;

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function inviteStaffAction(formData: FormData) {
  const { appUser, tenant } = await requireTier3Owner();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const email = getField(formData, "email").toLowerCase();
  const fullName = getField(formData, "full_name");

  if (!isValidEmail(email)) {
    redirect("/settings/team?error=E-mail inválido.");
  }

  if (email === appUser.email.toLowerCase()) {
    redirect("/settings/team?error=Você não pode convidar a si mesmo.");
  }

  // Count active staff in tenant
  const { count: activeStaff } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id)
    .eq("role", "staff");

  // Count pending (not expired, not used) invites
  const { count: pendingInvites } = await supabase
    .from("user_invites")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString());

  const total = (activeStaff ?? 0) + (pendingInvites ?? 0);
  if (total >= MAX_STAFF) {
    redirect(
      "/settings/team?error=Limite de 9 profissionais por clínica atingido.",
    );
  }

  // Check if this email is already a staff member of this tenant
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("tenant_id", appUser.tenant_id)
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    redirect(
      "/settings/team?error=Este e-mail já pertence a um membro da equipe.",
    );
  }

  // Check for existing pending invite for this email
  const { data: existingInvite } = await supabase
    .from("user_invites")
    .select("id")
    .eq("tenant_id", appUser.tenant_id)
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    redirect(
      "/settings/team?error=Já existe um convite pendente para este e-mail.",
    );
  }

  // Insert invite via admin client to bypass RLS during server action
  const { data: invite, error: insertError } = await adminClient
    .from("user_invites")
    .insert({
      tenant_id: appUser.tenant_id,
      email,
      full_name: fullName || null,
      invited_by: appUser.id,
    })
    .select("token")
    .single();

  if (insertError || !invite) {
    redirect("/settings/team?error=Erro ao criar convite. Tente novamente.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://pododesk.com.br"
      : "http://localhost:3000");

  try {
    await sendStaffInviteEmail({
      to: email,
      inviteeName: fullName || "Profissional",
      clinicName: tenant.name,
      ownerName: appUser.full_name,
      joinUrl: `${appUrl}/join/${invite.token}`,
    });
  } catch {
    // Email failure should not block the invite creation
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=Convite enviado com sucesso.");
}

export async function cancelInviteAction(formData: FormData) {
  const { appUser } = await requireTier3Owner();
  const supabase = await createClient();

  const inviteId = getField(formData, "invite_id");
  if (!inviteId) redirect("/settings/team?error=Convite não encontrado.");

  const { data: invite } = await supabase
    .from("user_invites")
    .select("id, tenant_id")
    .eq("id", inviteId)
    .eq("tenant_id", appUser.tenant_id)
    .maybeSingle();

  if (!invite) {
    redirect("/settings/team?error=Convite não encontrado ou sem permissão.");
  }

  await supabase.from("user_invites").delete().eq("id", inviteId);

  revalidatePath("/settings/team");
  redirect("/settings/team?success=Convite cancelado.");
}

export async function resendInviteAction(formData: FormData) {
  const { appUser, tenant } = await requireTier3Owner();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const inviteId = getField(formData, "invite_id");
  if (!inviteId) redirect("/settings/team?error=Convite não encontrado.");

  const { data: invite } = await supabase
    .from("user_invites")
    .select("id, tenant_id, email, full_name, token")
    .eq("id", inviteId)
    .eq("tenant_id", appUser.tenant_id)
    .maybeSingle();

  if (!invite) {
    redirect("/settings/team?error=Convite não encontrado ou sem permissão.");
  }

  // Extend expiry and generate a new token
  const newToken = crypto.randomUUID();
  const newExpiry = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await adminClient
    .from("user_invites")
    .update({ token: newToken, expires_at: newExpiry, used_at: null })
    .eq("id", inviteId);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://pododesk.com.br"
      : "http://localhost:3000");

  try {
    await sendStaffInviteEmail({
      to: invite.email,
      inviteeName: invite.full_name || "Profissional",
      clinicName: tenant.name,
      ownerName: appUser.full_name,
      joinUrl: `${appUrl}/join/${newToken}`,
    });
  } catch {
    // Email failure does not block invite refresh
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=Convite reenviado com sucesso.");
}

export async function removeStaffAction(formData: FormData) {
  const { appUser } = await requireTier3Owner();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const userId = getField(formData, "user_id");
  if (!userId) redirect("/settings/team?error=Usuário não encontrado.");

  // Verify the user is staff in the same tenant
  const { data: staffUser } = await supabase
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", userId)
    .eq("tenant_id", appUser.tenant_id)
    .eq("role", "staff")
    .maybeSingle();

  if (!staffUser) {
    redirect(
      "/settings/team?error=Usuário não encontrado ou sem permissão para remover.",
    );
  }

  // Delete from auth.users — cascades to public.users via DB trigger
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    redirect("/settings/team?error=Erro ao remover usuário. Tente novamente.");
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=Profissional removido da equipe.");
}
