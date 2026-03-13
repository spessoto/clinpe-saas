"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeTimeInput(value: string, fallback: string) {
  const source = value || fallback;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(source)) {
    return fallback;
  }

  return source.length === 5 ? `${source}:00` : source;
}

function parseWorkingDays(formData: FormData) {
  const raw = formData.getAll("working_days");

  return raw
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort((a, b) => a - b);
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  if (!value || typeof value === "string") {
    return false;
  }

  return (
    "size" in value &&
    typeof value.size === "number" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

export async function saveSettingsAction(formData: FormData) {
  const clinicName = getField(formData, "clinic_name");
  const fullName = getField(formData, "full_name");
  const email = getField(formData, "email");

  if (!clinicName || !fullName || !email) {
    redirect("/settings?error=Preencha clinica, nome e e-mail.");
  }

  const duration = Number(getField(formData, "appointment_duration_minutes"));
  const appointmentDurationMinutes = Number.isFinite(duration) ? duration : 60;

  if (appointmentDurationMinutes < 15 || appointmentDurationMinutes > 240) {
    redirect("/settings?error=Duracao de consulta invalida.");
  }

  const workingStart = normalizeTimeInput(
    getField(formData, "working_start_time"),
    "09:00:00",
  );
  const workingEnd = normalizeTimeInput(
    getField(formData, "working_end_time"),
    "17:00:00",
  );

  if (workingStart >= workingEnd) {
    redirect("/settings?error=Horario inicial deve ser menor que o final.");
  }

  const workingDays = parseWorkingDays(formData);
  if (workingDays.length === 0) {
    redirect("/settings?error=Selecione pelo menos um dia de atendimento.");
  }

  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  let profilePhotoUrl = getField(formData, "current_profile_photo_url") || null;

  const profilePhoto = formData.get("profile_photo");
  if (isUploadedFile(profilePhoto) && profilePhoto.size > 0) {
    const safeName = sanitizeFileName(profilePhoto.name || "profile.jpg");
    const path = `${appUser.tenant_id}/profiles/${appUser.id}/${Date.now()}-${randomUUID()}-${safeName}`;
    const fileBytes = new Uint8Array(await profilePhoto.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("medical-images")
      .upload(path, fileBytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: profilePhoto.type || "application/octet-stream",
      });

    if (uploadError) {
      redirect(`/settings?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("medical-images").getPublicUrl(path);
    profilePhotoUrl = data.publicUrl;
  }

  let bookingSlug = appUser.booking_slug;
  if (fullName !== appUser.full_name) {
    const { data: generatedSlug } = await supabase.rpc(
      "generate_unique_professional_slug",
      {
        base_name: fullName,
        p_user_id: appUser.id,
      },
    );

    if (typeof generatedSlug === "string" && generatedSlug.length > 0) {
      bookingSlug = generatedSlug;
    }
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      email,
      booking_slug: bookingSlug,
      profile_photo_url: profilePhotoUrl,
      working_days: workingDays,
      working_start_time: workingStart,
      working_end_time: workingEnd,
      appointment_duration_minutes: appointmentDurationMinutes,
    })
    .eq("id", appUser.id)
    .eq("tenant_id", appUser.tenant_id);

  if (userError) {
    redirect(`/settings?error=${encodeURIComponent(userError.message)}`);
  }

  if (clinicName !== tenant.name) {
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ name: clinicName })
      .eq("id", tenant.id);

    if (tenantError) {
      redirect(`/settings?error=${encodeURIComponent(tenantError.message)}`);
    }
  }

  let successMessage = "Configuracoes atualizadas com sucesso.";

  if (email !== appUser.email) {
    const { error: authError } = await supabase.auth.updateUser({ email });

    if (authError) {
      redirect(`/settings?error=${encodeURIComponent(authError.message)}`);
    }

    successMessage =
      "Configuracoes atualizadas. Confirme o novo e-mail na sua caixa de entrada.";
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  revalidatePath(`/${bookingSlug ?? ""}`);

  redirect(`/settings?success=${encodeURIComponent(successMessage)}`);
}
