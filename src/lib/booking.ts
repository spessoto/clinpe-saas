import {
  addDays,
  addMinutes,
  format,
  isBefore,
  setHours,
  setMinutes,
} from "date-fns";

import {
  createGoogleCalendarEvent,
  getGoogleBusyRanges,
} from "@/lib/google-calendar";
import { createAdminClient } from "@/lib/supabase/admin";

type Professional = {
  id: string;
  full_name: string;
  professional_register: string | null;
  profile_photo_url: string | null;
  booking_slug: string;
  tenant_id: string;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  booking_enabled: boolean;
  booking_page_title: string | null;
  booking_page_description: string | null;
};

type GoogleIntegration = {
  user_id: string;
  google_email: string | null;
  booking_widget_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

type ProfessionalSchedule = {
  working_days: number[];
  working_start_time: string;
  working_end_time: string;
  appointment_duration_minutes: number;
};

type PublicProfessionalBookingContext = {
  tenant: Tenant;
  professional: Professional;
  integration: GoogleIntegration | null;
};

export type PublicProfessionalBookingDiagnostic =
  | { status: "ok" }
  | { status: "professional_not_found" }
  | { status: "tenant_not_found" }
  | { status: "booking_disabled"; tenantName: string };

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultSchedule(): ProfessionalSchedule {
  return {
    working_days: [1, 2, 3, 4, 5],
    working_start_time: "09:00:00",
    working_end_time: "17:00:00",
    appointment_duration_minutes: 60,
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

  if (endMinutes <= startMinutes) {
    return [] as Date[];
  }

  const slots: Date[] = [];
  for (
    let minute = startMinutes;
    minute + duration <= endMinutes;
    minute += duration
  ) {
    const hour = Math.floor(minute / 60);
    const minutePart = minute % 60;
    const slot = setMinutes(setHours(date, hour), minutePart);

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

async function getProfessionalSchedule(
  professionalId: string,
  supabase = createAdminClient(),
) {
  const withSettingsResult = await supabase
    .from("users")
    .select(
      "working_days, working_start_time, working_end_time, appointment_duration_minutes",
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
    } satisfies ProfessionalSchedule;
  }

  return defaultSchedule();
}

export async function getPublicBookingContext(tenantSlug: string) {
  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, booking_enabled, booking_page_title, booking_page_description",
    )
    .eq("slug", tenantSlug)
    .single();

  if (!tenant) {
    return null;
  }

  const { data: professionals } = await supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, profile_photo_url, booking_slug",
    )
    .eq("tenant_id", tenant.id)
    .order("full_name", { ascending: true });

  return {
    tenant: tenant as Tenant,
    professionals: (professionals ?? []) as Professional[],
  };
}

export async function getPublicProfessionalBookingContext(
  professionalSlug: string,
) {
  const supabase = createAdminClient();

  let professional: Professional | null = null;

  const withColumnResult = await supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, profile_photo_url, booking_slug",
    )
    .eq("booking_slug", professionalSlug)
    .maybeSingle();

  if (withColumnResult.data) {
    professional = withColumnResult.data as Professional;
  } else {
    const fallbackUsers = await supabase
      .from("users")
      .select(
        "id, tenant_id, full_name, professional_register, profile_photo_url",
      );

    const found = (fallbackUsers.data ?? []).find(
      (user) => slugifyName(user.full_name) === professionalSlug,
    );

    if (found) {
      professional = {
        ...(found as Omit<Professional, "booking_slug">),
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
      "id, name, slug, booking_enabled, booking_page_title, booking_page_description",
    )
    .eq("id", professional.tenant_id)
    .single();

  if (!tenant || !tenant.booking_enabled) {
    return null;
  }

  const { data: integration } = await supabase
    .from("google_integrations")
    .select(
      "user_id, google_email, booking_widget_url, access_token, refresh_token, expires_at",
    )
    .eq("tenant_id", professional.tenant_id)
    .eq("user_id", professional.id)
    .maybeSingle();

  return {
    tenant: tenant as Tenant,
    professional,
    integration: (integration as GoogleIntegration | null) ?? null,
  } satisfies PublicProfessionalBookingContext;
}

export async function diagnosePublicProfessionalBooking(
  professionalSlug: string,
): Promise<PublicProfessionalBookingDiagnostic> {
  const supabase = createAdminClient();

  let professional: Professional | null = null;

  const withColumnResult = await supabase
    .from("users")
    .select(
      "id, tenant_id, full_name, professional_register, profile_photo_url, booking_slug",
    )
    .eq("booking_slug", professionalSlug)
    .maybeSingle();

  if (withColumnResult.data) {
    professional = withColumnResult.data as Professional;
  } else {
    const fallbackUsers = await supabase
      .from("users")
      .select(
        "id, tenant_id, full_name, professional_register, profile_photo_url",
      );

    const found = (fallbackUsers.data ?? []).find(
      (user) => slugifyName(user.full_name) === professionalSlug,
    );

    if (found) {
      professional = {
        ...(found as Omit<Professional, "booking_slug">),
        booking_slug: professionalSlug,
      };
    }
  }

  if (!professional) {
    return { status: "professional_not_found" };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, booking_enabled")
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

  return { status: "ok" };
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

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("user_id, google_email, access_token, refresh_token, expires_at")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", input.professionalId)
    .maybeSingle();

  let busyRanges: Array<{ start?: string | null; end?: string | null }> = [];

  if (integration?.refresh_token || integration?.access_token) {
    try {
      busyRanges = await getGoogleBusyRanges(
        integration as GoogleIntegration,
        dayStart.toISOString(),
        dayEnd.toISOString(),
      );
    } catch {
      busyRanges = [];
    }
  }

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

      const googleConflict = busyRanges.some((range) => {
        if (!range.start || !range.end) {
          return false;
        }
        return overlaps(
          slotStart,
          slotEnd,
          new Date(range.start),
          new Date(range.end),
        );
      });

      return !googleConflict;
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
    throw new Error("Clinica nao encontrada.");
  }

  const slots = await getAvailableSlots({
    tenantSlug: input.tenantSlug,
    professionalId: input.professionalId,
    date: format(new Date(input.scheduledAt), "yyyy-MM-dd"),
  });

  if (!slots.includes(input.scheduledAt)) {
    throw new Error(
      "Horario indisponivel. Atualize a agenda e escolha outro horario.",
    );
  }

  const supabase = createAdminClient();
  const schedule = await getProfessionalSchedule(
    input.professionalId,
    supabase,
  );
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
        patientError?.message ?? "Nao foi possivel criar o paciente.",
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
      scheduled_at: input.scheduledAt,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    throw new Error(appointmentError?.message ?? "Falha ao criar agendamento.");
  }

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", input.professionalId)
    .maybeSingle();

  if (integration?.refresh_token || integration?.access_token) {
    try {
      await createGoogleCalendarEvent(integration as GoogleIntegration, {
        summary: `Consulta PodoClin - ${input.patientName}`,
        description: `Agendamento publico da clinica ${context.tenant.name}. Telefone: ${input.patientPhone}. E-mail: ${input.patientEmail}`,
        start: input.scheduledAt,
        end: addMinutes(
          new Date(input.scheduledAt),
          schedule.appointment_duration_minutes,
        ).toISOString(),
        attendees: [input.patientEmail],
      });
    } catch {
      // Appointment remains booked in the system even if Google sync fails.
    }
  }

  return appointment.id;
}
