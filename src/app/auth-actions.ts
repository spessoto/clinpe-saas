"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signUpAction(formData: FormData) {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const fullName = getField(formData, "full_name");
  const clinicName = getField(formData, "clinic_name");
  const professionalRegister = getField(formData, "professional_register");

  if (!email || !password || !fullName || !clinicName) {
    redirect("/sign-up?error=Preencha todos os campos obrigatórios");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        clinic_name: clinicName,
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
      "/sign-in?message=Conta criada. Verifique seu e-mail para confirmar.",
    );
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const email = getField(formData, "email");
  const password = getField(formData, "password");

  if (!email || !password) {
    redirect("/sign-in?error=Informe e-mail e senha");
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
