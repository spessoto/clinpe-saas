import Link from "next/link";

import {
  AgendaCalendar,
  type AgendaCalendarEvent,
} from "@/app/(protected)/agenda/agenda-calendar";
import { requireActiveTenant } from "@/lib/auth";
import { listGoogleCalendarEvents } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";

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

function extractPatientName(summary: string) {
  const match = summary.match(/consulta\s+podoclin\s*-\s*(.+)$/i);
  return (match?.[1] ?? summary).trim();
}

function extractPatientEmail(description: string | null, attendees: string[]) {
  const fromDescription = description?.match(/e-?mail:\s*([^\.\n]+)/i)?.[1];
  if (fromDescription) {
    return fromDescription.trim();
  }

  return attendees[0] ?? "Nao informado";
}

function extractPatientPhone(description: string | null) {
  const match = description?.match(/telefone:\s*([^\.\n]+)/i)?.[1];
  return match?.trim() ?? "Nao informado";
}

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const selectedMonth =
    typeof params.month === "string" ? params.month : undefined;
  const monthDate = getMonthFromQuery(selectedMonth);

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

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    1,
  );

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("access_token, refresh_token, expires_at, google_email")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .maybeSingle();

  let events: AgendaCalendarEvent[] = [];
  let loadError: string | null = null;

  if (integration?.refresh_token || integration?.access_token) {
    try {
      const googleEvents = await listGoogleCalendarEvents(
        integration,
        monthStart.toISOString(),
        monthEnd.toISOString(),
      );

      events = googleEvents.map((event) => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        patientName: extractPatientName(event.summary),
        patientEmail: extractPatientEmail(event.description, event.attendees),
        patientPhone: extractPatientPhone(event.description),
      }));
    } catch {
      loadError = "Nao foi possivel carregar os eventos da agenda Google.";
    }
  }

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Agenda</h2>
            <p className="mt-1 text-sm text-muted">
              Calendario mensal com as consultas sincronizadas do Google
              Calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/agenda?month=${toMonthKey(prevMonth)}`}
              className="btn-outline-modern px-3 py-1.5 text-sm"
            >
              Mes anterior
            </Link>
            <Link
              href={`/agenda?month=${toMonthKey(nextMonth)}`}
              className="btn-outline-modern px-3 py-1.5 text-sm"
            >
              Proximo mes
            </Link>
          </div>
        </div>

        <p className="mt-4 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary">
          {formatMonthLabel(monthDate)}
        </p>

        {integration?.google_email ? (
          <p className="mt-3 text-sm text-muted">
            Conta conectada: {integration.google_email}
          </p>
        ) : (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            Conecte sua conta em{" "}
            <Link href="/settings" className="font-semibold underline">
              Configuracoes
            </Link>{" "}
            para exibir consultas no calendario.
          </p>
        )}

        {loadError ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
      </article>

      <AgendaCalendar monthDateIso={monthDate.toISOString()} events={events} />
    </section>
  );
}
