"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isCouponActiveNow,
  normalizeCouponCode,
  type CouponRow,
} from "@/lib/coupons";
import { getAppUrl } from "@/lib/env";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signUpAction(formData: FormData) {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const fullName = getField(formData, "full_name");
  const clinicName = getField(formData, "clinic_name");
  const cpfCnpj = getField(formData, "cpf_cnpj");
  const couponCode = normalizeCouponCode(getField(formData, "coupon_code"));
  const professionalRegister = getField(formData, "professional_register");
  const recaptchaToken = getField(formData, "recaptcha_token");

  if (!email || !password || !fullName || !clinicName || !cpfCnpj) {
    redirect("/sign-up?error=Preencha todos os campos obrigatórios");
  }

  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    redirect(
      "/sign-up?error=Verificação de segurança falhou. Tente novamente.",
    );
  }

  if (couponCode) {
    const adminClient = createAdminClient();
    const { data: coupon, error: couponError } = await adminClient
      .from("coupons")
      .select(
        "id, code, discount_type, discount_value, discounted_cycles, valid_from, valid_until, max_total_uses, times_redeemed, applies_to_period, is_active, updated_by_email, created_at, updated_at, description",
      )
      .eq("code", couponCode)
      .maybeSingle();

    if (couponError || !coupon) {
      redirect("/sign-up?error=Cupom%20inválido");
    }

    const resolvedCoupon = coupon as CouponRow;

    if (!isCouponActiveNow(resolvedCoupon)) {
      redirect("/sign-up?error=Cupom%20expirado%20ou%20inativo");
    }

    if (
      resolvedCoupon.max_total_uses !== null &&
      resolvedCoupon.times_redeemed >= resolvedCoupon.max_total_uses
    ) {
      redirect(
        "/sign-up?error=Este%20cupom%20já%20atingiu%20o%20limite%20de%20uso",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: existingRedemption, error: redemptionError } =
      await adminClient
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", resolvedCoupon.id)
        .eq("redeemed_by_email", normalizedEmail)
        .maybeSingle();

    if (redemptionError) {
      redirect("/sign-up?error=Falha%20ao%20validar%20o%20cupom");
    }

    if (existingRedemption) {
      redirect(
        "/sign-up?error=Este%20cupom%20já%20foi%20utilizado%20por%20este%20usuário",
      );
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAppUrl(),
      data: {
        full_name: fullName,
        clinic_name: clinicName,
        cpf_cnpj: cpfCnpj,
        coupon_code: couponCode,
        professional_register: professionalRegister,
      },
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");

  if (!data.session) {
    redirect(
      `/sign-in?message=${encodeURIComponent("Conta criada. Verifique seu e-mail para confirmar.")}&email=${encodeURIComponent(email)}`,
    );
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const recaptchaToken = getField(formData, "recaptcha_token");

  if (!email || !password) {
    redirect("/sign-in?error=Informe e-mail e senha");
  }

  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    redirect(
      "/sign-in?error=Verificação de segurança falhou. Tente novamente.",
    );
  }

  let destination = "/dashboard";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      destination = `/sign-in?error=${encodeURIComponent(error.message)}`;
    } else {
      revalidatePath("/dashboard");
    }
  } catch (error) {
    console.error("signInAction failed", error);
    destination =
      "/sign-in?error=Falha ao autenticar no servidor. Verifique as variáveis de ambiente do deploy.";
  }

  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function resendConfirmationAction(formData: FormData) {
  const email = getField(formData, "email").toLowerCase();
  const recaptchaToken = getField(formData, "recaptcha_token");
  const source =
    getField(formData, "source") === "/sign-up" ? "/sign-up" : "/sign-in";

  if (!email) {
    redirect(
      `${source}?error=${encodeURIComponent("Informe o e-mail para reenviar a confirmação.")}`,
    );
  }

  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    redirect(
      `${source}?error=${encodeURIComponent("Verificação de segurança falhou. Tente novamente.")}&email=${encodeURIComponent(email)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getAppUrl(),
    },
  });

  if (error) {
    redirect(
      `${source}?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`,
    );
  }

  redirect(
    `${source}?message=${encodeURIComponent("Reenvio solicitado. Verifique sua caixa de entrada e spam.")}&email=${encodeURIComponent(email)}`,
  );
}
