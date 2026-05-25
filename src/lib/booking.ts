import { addDays, addMinutes, format, isBefore } from "date-fns";

import { notifyNewPublicAppointment } from "@/lib/appointment-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasTenantAccess } from "@/lib/tenant-access";

type Professional = {
  id: string;
  full_name: string;
  email: string;
  professional_register: string | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
  booking_slug: string;
  tenant_id: string;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  booking_enabled: boolean;
  booking_page_title: string | null;
  booking_page_description: string | null;
  trial_ends_at: string;
  trial_extension_days: number;
  is_permanent_free_plan: boolean;
  subscription_status: "trialing" | "active" | "past_due";
  subscription_expires_at: string | null;
};

type ProfessionalSchedule = {
  working_days: number[];
  working_start_time: string;
  working_end_time: string;
  appointment_duration_minutes: number;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
};

type PublicProfessionalBookingContext = {
  tenant: Tenant;
  professional: Professional;
};

export type PublicProfessionalBookingDiagnostic =
  | { status: "ok" }
  | { status: "professional_not_found" }
  | { status: "tenant_not_found" }
  | { status: "booking_disabled"; tenantName: string }
  | { status: "subscription_inactive"; tenantName: string };

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getConfiguredAdminEmail() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return adminEmail && adminEmail.length > 0 ? adminEmail : null;
}

function defaultSchedule(): ProfessionalSchedule {
  return {
    working_days: [1, 2, 3, 4, 5],
    working_start_time: "09:00:00",
    working_end_time: "17:00:00",
    appointment_duration_minutes: 60,
    lunch_start_time: null,
    lunch_end_time: null,
  };
}

function toMinutesSinceMidnight(timeValue: string) {
  const [h, m] = timeValue.split(":").map((value) => Number(value));
  const hours = Number.isFinite(h) ? h : 0;
  const minutes = Number.isFinite(m) ? m : 0;
  return hours * 60 + minutes;
}

function createDaySlots(date: Date, schedule: ProfessionalSchedule) {
  if (!schedule.working_days.includes(date.getDay())) {
    return [] as Date[];
  }

  const startMinutes = toMinutesSinceMidnight(schedule.working_start_time);
  const endMinutes = toMinutesSinceMidnight(schedule.working_end_time);
  const duration = Math.max(15, schedule.appointment_duration_minutes);

  const lunchStart = schedule.lunch_start_time
    ? toMinutesSinceMidnight(schedule.lunch_start_time)
    : null;
  const lunchEnd = schedule.lunch_end_time
    ? toMinutesSinceMidnight(schedule.lunch_end_time)
    : null;

  if (endMinutes <= startMinutes) {
    return [] as Date[];
  }

  const slots: Date[] = [];
  for (
    let minute = startMinutes;
    minute + duration <= endMinutes;
    minute += duration
  ) {
    // Skip slots that overlap with lunch
    if (
      lunchStart !== null &&
      lunchEnd !== null &&
      minute < lunchEnd &&
      minute + duration > lunchStart
    ) {
      continue;
    }

    const hour = Math.floor(minute / 60);
    const minutePart = minute % 60;
    // Interpreta os horários de trabalho no fuso horário do Brasil (BRT = UTC-3)
    // para que "09:00" seja armazenado corretamente como 12:00Z no banco.
    const yyyy = String(date.getFullYear()).padStart(4, "0");
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(hour).padStart(2, "0");
    const min = String(minutePart).padStart(2, "0");
    const slot = new Date(`${yyyy}-${mo}-${dd}T${hh}:${min}:00-03:00`);

    if (isBefore(slot, new Date())) {
      continue;
    }

    slots.push(slot);
  }

  return slots;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function safeDateFromInput(dateInput?: string) {
  if (!dateInput) {
    return new Date();
  }

  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export async function getProfessionalSchedule(
  professionalId: string,
  supabase = createAdminClient(),
) {
  const withSettingsResult = await supabase
    .from("users")
    .select(
      "working_days, working_start_time, working_end_time, appointment_duration_minutes, lunch_start_time, lunch_end_time",
    )
    .eq("id", professionalId)
    .maybeSingle();

  if (withSettingsResult.data) {
    return {
      working_days:
        (withSettingsResult.data.working_days as number[] | null) ??
        defaultSchedule().working_days,
      working_start_time:
        withSettingsResult.data.working_start_time ??
        defaultSchedule().working_start_time,
      working_end_time:
        withSettingsResult.data.working_end_time ??
        defaultSchedule().working_end_time,
      appointment_duration_minutes:
        withSettingsResult.data.appointment_duration_minutes ??
        defaultSchedule().appointment_duration_minutes,
      lunch_start_time:
        (withSettingsResult.data.lunch_start_time as string | null) ?? null,
      lunch_end_time:
        (withSettingsResult.data.lunch_end_time as string | null) ?? null,
    } satisfies ProfessionalSchedule;
  }

  return defaultSchedule();
}

export async function getPublicBookingContext(tenantSlug: string) {
  const supabase = createAdminClient();
  const adminEmail = getConfiguredAdminEmail();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, logo_url, booking_enabled, booking_page_title, booking_page_description, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, subscription_expires_at",
    )
    .eq("slug", tenantSlug)
    .single();

  if (!tenant || !hasTenantAccess(tenant as Tenant)) {
    return null;
  }

  let professionalsQuery = supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, profile_photo_url, booking_slug, email",
    )
    .eq("tenant_id", tenant.id)
    .order("full_name", { ascending: true });

  if (adminEmail) {
    professionalsQuery = professionalsQuery.neq("email", adminEmail);
  }

  const { data: professionals } = await professionalsQuery;

  return {
    tenant: tenant as Tenant,
    professionals: (professionals ?? []) as Professional[],
  };
}

export async function getPublicProfessionalBookingContext(
  professionalSlug: string,
) {
  const supabase = createAdminClient();
  const adminEmail = getConfiguredAdminEmail();

  let professional: Professional | null = null;

  let withAvatarQuery = supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, avatar_url, profile_photo_url, booking_slug, email",
    )
    .eq("booking_slug", professionalSlug);

  if (adminEmail) {
    withAvatarQuery = withAvatarQuery.neq("email", adminEmail);
  }

  const withAvatarResult = await withAvatarQuery.maybeSingle();

  if (withAvatarResult.data) {
    const row = withAvatarResult.data as Professional;
    professional = {
      ...row,
      profile_photo_url: row.avatar_url ?? row.profile_photo_url,
    };
  } else {
    const avatarColumnMissing =
      withAvatarResult.error?.message?.toLowerCase().includes("avatar_url") ??
      false;

    const fallbackUsers = await (avatarColumnMissing
      ? supabase
          .from("users")
          .select(
            "id, tenant_id, full_name, professional_register, profile_photo_url, email",
          )
      : supabase
          .from("users")
          .select(
            "id, tenant_id, full_name, professional_register, avatar_url, profile_photo_url, email",
          ));

    const found = (fallbackUsers.data ?? []).find(
      (user) =>
        slugifyName(user.full_name) === professionalSlug &&
        (!adminEmail || user.email?.toLowerCase() !== adminEmail),
    );

    if (found) {
      const avatarUrl =
        "avatar_url" in found ? (found.avatar_url as string | null) : null;
      const profilePhotoUrl =
        (found.profile_photo_url as string | null) ?? avatarUrl;

      professional = {
        ...(found as Omit<Professional, "booking_slug" | "avatar_url">),
        avatar_url: avatarUrl,
        profile_photo_url: avatarUrl ?? profilePhotoUrl,
        booking_slug: professionalSlug,
      };
    }
  }

  if (!professional) {
    return null;
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, logo_url, booking_enabled, booking_page_title, booking_page_description, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, subscription_expires_at",
    )
    .eq("id", professional.tenant_id)
    .single();

  if (
    !tenant ||
    !tenant.booking_enabled ||
    !hasTenantAccess(tenant as Tenant)
  ) {
    return null;
  }

  return {
    tenant: tenant as Tenant,
    professional,
  } satisfies PublicProfessionalBookingContext;
}

export async function diagnosePublicProfessionalBooking(
  professionalSlug: string,
): Promise<PublicProfessionalBookingDiagnostic> {
  const supabase = createAdminClient();
  const adminEmail = getConfiguredAdminEmail();

  let professional: Professional | null = null;

  let withAvatarQuery = supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, avatar_url, profile_photo_url, booking_slug",
    )
    .eq("booking_slug", professionalSlug);

  if (adminEmail) {
    withAvatarQuery = withAvatarQuery.neq("email", adminEmail);
  }

  const withAvatarResult = await withAvatarQuery.maybeSingle();

  if (withAvatarResult.data) {
    const row = withAvatarResult.data as Professional;
    professional = {
      ...row,
      profile_photo_url: row.avatar_url ?? row.profile_photo_url,
    };
  } else {
    const avatarColumnMissing =
      withAvatarResult.error?.message?.toLowerCase().includes("avatar_url") ??
      false;

    const fallbackUsers = await (avatarColumnMissing
      ? supabase
          .from("users")
          .select(
            "id, tenant_id, full_name, professional_register, profile_photo_url, email",
          )
      : supabase
          .from("users")
          .select(
            "id, tenant_id, full_name, professional_register, avatar_url, profile_photo_url, email",
          ));

    const found = (fallbackUsers.data ?? []).find(
      (user) =>
        slugifyName(user.full_name) === professionalSlug &&
        (!adminEmail || user.email?.toLowerCase() !== adminEmail),
    );

    if (found) {
      const avatarUrl =
        "avatar_url" in found ? (found.avatar_url as string | null) : null;
      const profilePhotoUrl =
        (found.profile_photo_url as string | null) ?? avatarUrl;

      professional = {
        ...(found as Omit<Professional, "booking_slug" | "avatar_url">),
        avatar_url: avatarUrl,
        profile_photo_url: avatarUrl ?? profilePhotoUrl,
        booking_slug: professionalSlug,
      };
    }
  }

  if (!professional) {
    return { status: "professional_not_found" };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, logo_url, booking_enabled, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, subscription_expires_at",
    )
    .eq("id", professional.tenant_id)
    .maybeSingle();

  if (!tenant) {
    return { status: "tenant_not_found" };
  }

  if (!tenant.booking_enabled) {
    return {
      status: "booking_disabled",
      tenantName: tenant.name,
    };
  }

  if (!hasTenantAccess(tenant as Tenant)) {
    return {
      status: "subscription_inactive",
      tenantName: tenant.name,
    };
  }

  return { status: "ok" };
}

export async function diagnosePublicBooking(tenantSlug: string): Promise<{
  status:
    | "tenant_not_found"
    | "booking_disabled"
    | "subscription_inactive"
    | "ok";
  tenantName?: string;
}> {
  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, booking_enabled, trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, subscription_expires_at",
    )
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (!tenant) {
    return { status: "tenant_not_found" };
  }

  if (!tenant.booking_enabled) {
    return { status: "booking_disabled", tenantName: tenant.name };
  }

  if (!hasTenantAccess(tenant as Tenant)) {
    return { status: "subscription_inactive", tenantName: tenant.name };
  }

  return { status: "ok", tenantName: tenant.name };
}

export async function getAvailableSlots(input: {
  tenantSlug: string;
  professionalId: string;
  date: string;
}) {
  const context = await getPublicBookingContext(input.tenantSlug);

  if (!context) {
    return [] as string[];
  }

  const supabase = createAdminClient();
  const schedule = await getProfessionalSchedule(
    input.professionalId,
    supabase,
  );
  const day = safeDateFromInput(input.date);
  const dayStart = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    0,
    0,
  );
  const dayEnd = addDays(dayStart, 1);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .eq("tenant_id", context.tenant.id)
    .eq("professional_id", input.professionalId)
    .neq("status", "canceled")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());

  const { data: blocks } = await supabase
    .from("agenda_blocks")
    .select("starts_at, ends_at")
    .eq("tenant_id", context.tenant.id)
    .eq("professional_id", input.professionalId)
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  return createDaySlots(day, schedule)
    .filter((slotStart) => {
      const slotEnd = addMinutes(
        slotStart,
        schedule.appointment_duration_minutes,
      );

      const dbConflict = (appointments ?? []).some((appointment) => {
        const appointmentStart = new Date(appointment.scheduled_at);
        const appointmentEnd = addMinutes(
          appointmentStart,
          schedule.appointment_duration_minutes,
        );
        return overlaps(slotStart, slotEnd, appointmentStart, appointmentEnd);
      });

      if (dbConflict) {
        return false;
      }

      const blockConflict = (blocks ?? []).some((block) => {
        return overlaps(
          slotStart,
          slotEnd,
          new Date(block.starts_at),
          new Date(block.ends_at),
        );
      });

      if (blockConflict) {
        return false;
      }

      return true;
    })
    .map((slot) => slot.toISOString());
}

export async function getAvailableSlotsByTenantId(input: {
  tenantId: string;
  professionalId: string;
  date: string;
}) {
  const supabase = createAdminClient();
  const schedule = await getProfessionalSchedule(
    input.professionalId,
    supabase,
  );
  const day = safeDateFromInput(input.date);
  const dayStart = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    0,
    0,
  );
  const dayEnd = addDays(dayStart, 1);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .eq("tenant_id", input.tenantId)
    .eq("professional_id", input.professionalId)
    .neq("status", "canceled")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());

  const { data: blocks } = await supabase
    .from("agenda_blocks")
    .select("starts_at, ends_at")
    .eq("tenant_id", input.tenantId)
    .eq("professional_id", input.professionalId)
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  return createDaySlots(day, schedule)
    .filter((slotStart) => {
      const slotEnd = addMinutes(
        slotStart,
        schedule.appointment_duration_minutes,
      );

      const dbConflict = (appointments ?? []).some((appointment) => {
        const appointmentStart = new Date(appointment.scheduled_at);
        const appointmentEnd = addMinutes(
          appointmentStart,
          schedule.appointment_duration_minutes,
        );
        return overlaps(slotStart, slotEnd, appointmentStart, appointmentEnd);
      });

      if (dbConflict) {
        return false;
      }

      const blockConflict = (blocks ?? []).some((block) => {
        return overlaps(
          slotStart,
          slotEnd,
          new Date(block.starts_at),
          new Date(block.ends_at),
        );
      });

      if (blockConflict) {
        return false;
      }

      return true;
    })
    .map((slot) => slot.toISOString());
}

export async function createPublicBooking(input: {
  tenantSlug: string;
  professionalId: string;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
}) {
  const context = await getPublicBookingContext(input.tenantSlug);

  if (!context) {
    throw new Error("Clínica não encontrada.");
  }

  const slots = await getAvailableSlots({
    tenantSlug: input.tenantSlug,
    professionalId: input.professionalId,
    date: format(new Date(input.scheduledAt), "yyyy-MM-dd"),
  });

  if (!slots.includes(input.scheduledAt)) {
    throw new Error(
      "Horário indisponível. Atualize a agenda e escolha outro horário.",
    );
  }

  const supabase = createAdminClient();
  const { data: professional } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("tenant_id", context.tenant.id)
    .eq("id", input.professionalId)
    .maybeSingle();

  if (!professional) {
    throw new Error("Profissional de atendimento não encontrado.");
  }

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id, email")
    .eq("tenant_id", context.tenant.id)
    .eq("phone", input.patientPhone)
    .maybeSingle();

  let patientId = existingPatient?.id;

  if (!patientId) {
    const { data: insertedPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        tenant_id: context.tenant.id,
        name: input.patientName,
        email: input.patientEmail,
        phone: input.patientPhone,
      })
      .select("id")
      .single();

    if (patientError || !insertedPatient) {
      throw new Error(
        patientError?.message ?? "Não foi possível criar o paciente.",
      );
    }

    patientId = insertedPatient.id;
  } else if (existingPatient && !existingPatient.email && input.patientEmail) {
    await supabase
      .from("patients")
      .update({ email: input.patientEmail })
      .eq("tenant_id", context.tenant.id)
      .eq("id", patientId);
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: context.tenant.id,
      patient_id: patientId,
      professional_id: input.professionalId,
      professional_name_snapshot: professional.full_name,
      scheduled_at: input.scheduledAt,
      status: "scheduled",
      confirmation_status: "pending",
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    throw new Error(appointmentError?.message ?? "Falha ao criar agendamento.");
  }

  await notifyNewPublicAppointment({
    tenantId: context.tenant.id,
    appointmentId: appointment.id,
    clinicName: context.tenant.name,
    professionalId: professional.id,
    professionalName: professional.full_name,
    professionalEmail: professional.email,
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
    scheduledAt: input.scheduledAt,
  });

  return appointment.id;
}
