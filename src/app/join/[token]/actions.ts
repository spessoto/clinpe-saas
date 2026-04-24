"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function acceptInviteAction(formData: FormData) {
  const adminClient = createAdminClient();

  const token = getField(formData, "token");
  const fullName = getField(formData, "full_name");
  const professionalRegister = getField(formData, "professional_register");
  const password = getField(formData, "password");
  const confirmPassword = getField(formData, "confirm_password");

  if (!token) {
    redirect("/sign-in?error=Token de convite inválido.");
  }

  if (password.length < 8) {
    redirect(`/join/${token}?error=A senha deve ter no mínimo 8 caracteres.`);
  }

  if (password !== confirmPassword) {
    redirect(`/join/${token}?error=As senhas não coincidem.`);
  }

  if (!fullName) {
    redirect(`/join/${token}?error=Informe seu nome completo.`);
  }

  // Validate invite
  const { data: invite } = await adminClient
    .from("user_invites")
    .select("id, email, tenant_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    redirect("/sign-in?error=Convite inválido ou não encontrado.");
  }

  if (invite.used_at) {
    redirect("/sign-in?error=Este convite já foi utilizado.");
  }

  if (new Date(invite.expires_at) < new Date()) {
    redirect(
      "/sign-in?error=Este convite expirou. Solicite um novo convite ao proprietário da clínica.",
    );
  }

  // Validate tenant is still active tier_3
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("billing_tier, subscription_status")
    .eq("id", invite.tenant_id)
    .maybeSingle();

  if (!tenant || tenant.billing_tier !== "tier_3") {
    redirect(
      "/sign-in?error=O plano desta clínica não suporta múltiplos profissionais.",
    );
  }

  // Create the staff user — the DB trigger will detect invite_token in metadata
  // and create the user with the correct tenant_id and role='staff'
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      invite_token: token,
      full_name: fullName,
      professional_register: professionalRegister || null,
    },
  });

  if (createError) {
    // If user already exists, surface a helpful error
    if (createError.message.toLowerCase().includes("already")) {
      redirect(
        `/sign-in?error=Uma conta com este e-mail já existe. Faça login.`,
      );
    }
    redirect(
      `/join/${token}?error=Erro ao criar conta: ${createError.message}`,
    );
  }

  redirect(
    "/sign-in?success=Conta criada com sucesso! Faça login para acessar a clínica.",
  );
}
