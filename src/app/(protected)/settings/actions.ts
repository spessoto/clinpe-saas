"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateAccountBillingProfile } from "@/lib/account-billing-profile";
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
  const billingDocument = getField(formData, "cpf_cnpj");
  const currentLogoUrl = getField(formData, "current_logo_url");

  if (!clinicName || !fullName || !email) {
    redirect("/settings?error=Preencha clínica, nome e e-mail.");
  }

  const duration = Number(getField(formData, "appointment_duration_minutes"));
  const appointmentDurationMinutes = Number.isFinite(duration) ? duration : 60;

  if (appointmentDurationMinutes < 15 || appointmentDurationMinutes > 240) {
    redirect("/settings?error=Duração de consulta inválida.");
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
    redirect("/settings?error=Horário inicial deve ser menor que o final.");
  }

  const workingDays = parseWorkingDays(formData);
  if (workingDays.length === 0) {
    redirect("/settings?error=Selecione pelo menos um dia de atendimento.");
  }

  const hasLunchBreak = getField(formData, "has_lunch_break") === "1";
  let lunchStartTime: string | null = null;
  let lunchEndTime: string | null = null;

  if (hasLunchBreak) {
    lunchStartTime = normalizeTimeInput(
      getField(formData, "lunch_start_time"),
      "12:00:00",
    );
    lunchEndTime = normalizeTimeInput(
      getField(formData, "lunch_end_time"),
      "13:00:00",
    );

    if (lunchStartTime >= lunchEndTime) {
      redirect(
        "/settings?error=Horário de início do almoço deve ser menor que o final.",
      );
    }

    if (lunchStartTime < workingStart || lunchEndTime > workingEnd) {
      redirect(
        "/settings?error=Horário de almoço deve estar dentro do expediente.",
      );
    }
  }

  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  let profilePhotoUrl =
    getField(formData, "current_profile_photo_url") ||
    appUser.avatar_url ||
    null;
  let logoUrl = currentLogoUrl || tenant.logo_url || null;

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

  const logoFile = formData.get("logo_file");
  if (isUploadedFile(logoFile) && logoFile.size > 0) {
    const safeName = sanitizeFileName(logoFile.name || "logo.jpg");
    const path = `${tenant.id}/logos/${appUser.id}/${Date.now()}-${randomUUID()}-${safeName}`;
    const fileBytes = new Uint8Array(await logoFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("medical-images")
      .upload(path, fileBytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: logoFile.type || "application/octet-stream",
      });

    if (uploadError) {
      redirect(`/settings?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("medical-images").getPublicUrl(path);
    logoUrl = data.publicUrl;
  }

  let bookingSlug = appUser.booking_slug;
  let emailChanged = false;

  try {
    const result = await updateAccountBillingProfile({
      supabase,
      appUser,
      fullName,
      email,
      billingDocument,
      userFields: {
        profile_photo_url: profilePhotoUrl,
        working_days: workingDays,
        working_start_time: workingStart,
        working_end_time: workingEnd,
        appointment_duration_minutes: appointmentDurationMinutes,
        lunch_start_time: lunchStartTime,
        lunch_end_time: lunchEndTime,
      },
      tenantFields: {
        name: clinicName,
        logo_url: logoUrl,
      },
    });

    bookingSlug = result.bookingSlug;
    emailChanged = result.emailChanged;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao salvar configurações.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  let successMessage = "Configurações atualizadas com sucesso.";

  if (emailChanged) {
    successMessage =
      "Configurações atualizadas. Confirme o novo e-mail na sua caixa de entrada.";
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  revalidatePath("/billing");
  revalidatePath(`/${bookingSlug ?? ""}`);

  redirect(`/settings?success=${encodeURIComponent(successMessage)}`);
}

/**
 * Upload de arquivo para Supabase Storage (avatar ou logo)
 * Espera um FormData com as seguintes propriedades:
 * - file: File
 * - type: "avatar" | "logo"
 */
export async function uploadProfileImageAction(formData: FormData) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const type = getField(formData, "type");

  if (!file || !type) {
    return { error: "Arquivo e tipo são obrigatórios" };
  }

  if (!["avatar", "logo"].includes(type)) {
    return { error: "Tipo inválido" };
  }

  try {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "png";
    const preferredBucket = type === "avatar" ? "avatars" : "clinic-logos";
    const fallbackBucket = "medical-images";
    const preferredPath = `${tenant.id}/${appUser.id}/${Date.now()}.${fileExtension}`;
    const fallbackPath = `${tenant.id}/${type}/${appUser.id}/${Date.now()}.${fileExtension}`;

    // Converter file para Uint8Array
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    let uploadedPath: string | null = null;
    let uploadedBucket = preferredBucket;

    const tryUpload = async (bucketName: string, path: string) => {
      return supabase.storage.from(bucketName).upload(path, fileBytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
    };

    const preferredUpload = await tryUpload(preferredBucket, preferredPath);

    if (preferredUpload.error) {
      const message = preferredUpload.error.message.toLowerCase();
      const isBucketMissing =
        message.includes("bucket not found") ||
        message.includes("not found") ||
        message.includes("does not exist");

      if (!isBucketMissing) {
        console.error(`Erro ao upload de ${type}:`, preferredUpload.error);
        return { error: preferredUpload.error.message };
      }

      const fallbackUpload = await tryUpload(fallbackBucket, fallbackPath);
      if (fallbackUpload.error) {
        console.error(
          `Erro ao upload de ${type} no fallback:`,
          fallbackUpload.error,
        );
        return {
          error: `Falha no upload de imagem: ${fallbackUpload.error.message}`,
        };
      }

      uploadedBucket = fallbackBucket;
      uploadedPath = fallbackUpload.data.path;
    } else {
      uploadedPath = preferredUpload.data.path;
    }

    if (!uploadedPath) {
      return { error: "Falha ao salvar arquivo no Storage" };
    }

    // Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from(uploadedBucket)
      .getPublicUrl(uploadedPath);

    if (!publicUrlData?.publicUrl) {
      return { error: "Falha ao gerar URL pública" };
    }

    // Atualizar campo correspondente no banco de dados
    if (type === "avatar") {
      const avatarUpdate = await supabase
        .from("users")
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq("id", appUser.id)
        .eq("tenant_id", appUser.tenant_id);

      if (avatarUpdate.error) {
        const message = avatarUpdate.error.message.toLowerCase();
        const isMissingAvatarColumn =
          message.includes("avatar_url") &&
          (message.includes("schema cache") ||
            message.includes("column") ||
            message.includes("not found"));

        if (!isMissingAvatarColumn) {
          return { error: avatarUpdate.error.message };
        }

        const legacyUpdate = await supabase
          .from("users")
          .update({ profile_photo_url: publicUrlData.publicUrl })
          .eq("id", appUser.id)
          .eq("tenant_id", appUser.tenant_id);

        if (legacyUpdate.error) {
          return { error: legacyUpdate.error.message };
        }
      }
    } else if (type === "logo") {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ logo_url: publicUrlData.publicUrl })
        .eq("id", tenant.id);

      if (updateError) {
        return { error: updateError.message };
      }
    }

    revalidatePath("/settings");

    return {
      url: publicUrlData.publicUrl,
      type,
    };
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return { error: "Erro ao fazer upload do arquivo" };
  }
}
