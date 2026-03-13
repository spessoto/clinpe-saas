import {
  addDays,
  addHours,
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
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

function createDaySlots(date: Date) {
  const slots: Date[] = [];
  for (let hour = 9; hour < 17; hour += 1) {
    const slot = setMinutes(setHours(date, hour), 0);
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
    .select("id, full_name, professional_register")
    .eq("tenant_id", tenant.id)
    .order("full_name", { ascending: true });

  return {
    tenant: tenant as Tenant,
    professionals: (professionals ?? []) as Professional[],
  };
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

  return createDaySlots(day)
    .filter((slotStart) => {
      const slotEnd = addHours(slotStart, 1);

      const dbConflict = (appointments ?? []).some((appointment) => {
        const appointmentStart = new Date(appointment.scheduled_at);
        const appointmentEnd = addHours(appointmentStart, 1);
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
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
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
        description: `Agendamento publico da clinica ${context.tenant.name}. Telefone: ${input.patientPhone}`,
        start: input.scheduledAt,
        end: addHours(new Date(input.scheduledAt), 1).toISOString(),
      });
    } catch {
      // Appointment remains booked in the system even if Google sync fails.
    }
  }

  return appointment.id;
}
