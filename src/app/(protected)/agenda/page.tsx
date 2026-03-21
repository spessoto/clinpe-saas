import Link from "next/link";
import dynamic from "next/dynamic";

import type { AgendaCalendarEvent } from "@/app/(protected)/agenda/agenda-calendar";
import { requireActiveTenant } from "@/lib/auth";
import { listGoogleCalendarEvents } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

const AgendaCalendar = dynamic(
  () =>
    import("@/app/(protected)/agenda/agenda-calendar").then(
      (mod) => mod.AgendaCalendar,
    ),
  {
    loading: () => (
      <article className="surface-card p-6">
        <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
      </article>
    ),
  },
);

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getMonthFromQuery(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [year, month] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function toMonthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function isMissingAgendaColumnsError(
  error: {
    message?: string;
    details?: string;
    hint?: string;
  } | null,
) {
  if (!error) {
    return false;
  }

  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
      .toLowerCase()
      .trim();

  return (
    text.includes("confirmation_status") ||
    text.includes("google_event_id") ||
    text.includes("pgrst204")
  );
}

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;
  let warningBanner =
    typeof params.warning === "string" ? params.warning : null;

  const selectedMonth =
    typeof params.month === "string" ? params.month : undefined;
  const monthDate = getMonthFromQuery(selectedMonth);
  const monthKey = toMonthKey(monthDate);

  const prevMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() - 1,
    1,
  );
  const nextMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    1,
  );

  const { start: monthStart, end: monthEnd } = toMonthRange(monthDate);

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("google_email, access_token, refresh_token, expires_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .maybeSingle();

  let events: AgendaCalendarEvent[] = [];
  let loadError: string | null = null;
  let schemaWarning: string | null = null;

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      "id, scheduled_at, status, confirmation_status, patient:patients(name, email, phone)",
    )
    .eq("tenant_id", appUser.tenant_id)
    .neq("status", "canceled")
    .gte("scheduled_at", monthStart.toISOString())
    .lt("scheduled_at", monthEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  if (appUser.role === "staff") {
    appointmentsQuery = appointmentsQuery.eq("professional_id", appUser.id);
  }

  const { data: appointments, error: appointmentsError } =
    await appointmentsQuery;

  const mapEvents = (
    rows: Array<{
      id: string;
      scheduled_at: string;
      status: "scheduled" | "completed" | "canceled";
      confirmation_status?: "pending" | "confirmed" | "rejected" | null;
      patient:
        | { name: string; email: string | null; phone: string | null }
        | { name: string; email: string | null; phone: string | null }[]
        | null;
    }>,
  ) => {
    return rows.map((appointment) => {
      const patient = Array.isArray(appointment.patient)
        ? (appointment.patient[0] as
            | {
                name: string;
                email: string | null;
                phone: string | null;
              }
            | undefined)
        : appointment.patient;

      const confirmationStatus = appointment.confirmation_status
        ? appointment.confirmation_status
        : appointment.status === "canceled"
          ? "rejected"
          : "pending";

      return {
        id: appointment.id,
        summary: patient?.name ?? "Paciente não informado",
        start: appointment.scheduled_at,
        end: appointment.scheduled_at,
        patientName: patient?.name ?? "Paciente não informado",
        patientEmail: patient?.email ?? "Não informado",
        patientPhone: patient?.phone ?? "Não informado",
        status: appointment.status,
        confirmationStatus,
      } satisfies AgendaCalendarEvent;
    });
  };

  if (appointmentsError && isMissingAgendaColumnsError(appointmentsError)) {
    let legacyQuery = supabase
      .from("appointments")
      .select("id, scheduled_at, status, patient:patients(name, email, phone)")
      .eq("tenant_id", appUser.tenant_id)
      .neq("status", "canceled")
      .gte("scheduled_at", monthStart.toISOString())
      .lt("scheduled_at", monthEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    if (appUser.role === "staff") {
      legacyQuery = legacyQuery.eq("professional_id", appUser.id);
    }

    const { data: legacyAppointments, error: legacyError } = await legacyQuery;

    if (legacyError) {
      loadError = "Não foi possível carregar os agendamentos do mês.";
    } else {
      events = mapEvents(
        (legacyAppointments ?? []) as Array<{
          id: string;
          scheduled_at: string;
          status: "scheduled" | "completed" | "canceled";
          patient:
            | { name: string; email: string | null; phone: string | null }
            | { name: string; email: string | null; phone: string | null }[]
            | null;
        }>,
      );
      schemaWarning =
        "A agenda está em modo de compatibilidade. Aplique a migration mais recente para habilitar confirmação/cancelamento com e-mail.";
    }
  } else if (appointmentsError) {
    loadError = "Não foi possível carregar os agendamentos do mês.";
  } else {
    events = mapEvents(
      (appointments ?? []) as Array<{
        id: string;
        scheduled_at: string;
        status: "scheduled" | "completed" | "canceled";
        confirmation_status?: "pending" | "confirmed" | "rejected" | null;
        patient:
          | { name: string; email: string | null; phone: string | null }
          | { name: string; email: string | null; phone: string | null }[]
          | null;
      }>,
    );
  }

  if (
    events.length === 0 &&
    !loadError &&
    (integration?.refresh_token || integration?.access_token)
  ) {
    try {
      const googleEvents = await listGoogleCalendarEvents(
        {
          access_token: integration?.access_token ?? null,
          refresh_token: integration?.refresh_token ?? null,
          expires_at: integration?.expires_at ?? null,
        },
        monthStart.toISOString(),
        monthEnd.toISOString(),
      );

      events = googleEvents.map((event) => ({
        id: `google:${event.id}`,
        summary: event.summary || "Evento do Google",
        start: event.start,
        end: event.end,
        patientName: event.summary || "Evento do Google",
        patientEmail: event.attendees[0] ?? "Não informado",
        patientPhone: "Não informado",
        status: "scheduled",
        confirmationStatus: "pending",
        isExternal: true,
      }));

      if (events.length > 0) {
        warningBanner ??=
          "Mostrando eventos do Google Calendar. Para confirmar/cancelar com e-mail, o agendamento precisa existir no PodoDesk.";
      }
    } catch {
      // If Google API fails, we keep the database result (possibly empty).
    }
  }

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Agenda</h2>

          <div className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:flex sm:w-auto sm:items-center sm:gap-2 sm:rounded-full sm:px-2 sm:py-1">
            <Link
              href={`/agenda?month=${toMonthKey(prevMonth)}`}
              className="rounded-full px-3 py-1.5 text-center text-sm font-semibold text-foreground transition hover:bg-slate-100"
            >
              Mês anterior
            </Link>
            <p className="rounded-full bg-secondary/10 px-3 py-1 text-center text-sm font-semibold text-secondary">
              {formatMonthLabel(monthDate)}
            </p>
            <Link
              href={`/agenda?month=${toMonthKey(nextMonth)}`}
              className="rounded-full px-3 py-1.5 text-center text-sm font-semibold text-foreground transition hover:bg-slate-100"
            >
              Próximo mês
            </Link>
          </div>
        </div>

        {success ? (
          <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}
        {warningBanner ? (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {warningBanner}
          </p>
        ) : null}
        {schemaWarning ? (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {schemaWarning}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!integration?.google_email ? (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            Conecte sua conta em{" "}
            <Link href="/settings" className="font-semibold underline">
              Configurações
            </Link>{" "}
            para manter a sincronização dos cancelamentos com o Google Calendar.
          </p>
        ) : null}

        {loadError ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
      </article>

      <AgendaCalendar monthKey={monthKey} events={events} />
    </section>
  );
}
