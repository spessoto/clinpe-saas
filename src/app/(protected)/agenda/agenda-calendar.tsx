"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  cancelAppointmentAction,
  confirmAppointmentAction,
} from "@/app/(protected)/agenda/actions";

export type AgendaCalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  status: "scheduled" | "completed" | "canceled";
  confirmationStatus: "pending" | "confirmed" | "rejected";
  isExternal?: boolean;
};

type Props = {
  monthKey: string;
  events: AgendaCalendarEvent[];
};

function parseMonthKey(value: string) {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfCalendarGrid(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const weekday = start.getDay();
  start.setDate(start.getDate() - weekday);
  return start;
}

function endOfCalendarGrid(monthDate: Date) {
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const weekday = end.getDay();
  end.setDate(end.getDate() + (6 - weekday));
  return end;
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfCalendarGrid(monthDate);
  const end = endOfCalendarGrid(monthDate);

  const days: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHourLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDayLabel(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getEventTone(event: AgendaCalendarEvent) {
  if (event.status === "canceled" || event.confirmationStatus === "rejected") {
    return "bg-destructive/10 text-destructive hover:bg-destructive/20";
  }

  if (event.confirmationStatus === "confirmed") {
    return "bg-primary/10 text-primary hover:bg-primary/20";
  }

  return "bg-warning/10 text-warning hover:bg-warning/20";
}

function getStatusLabel(event: AgendaCalendarEvent) {
  if (event.status === "canceled" || event.confirmationStatus === "rejected") {
    return "Cancelado";
  }

  if (event.confirmationStatus === "confirmed") {
    return "Confirmado";
  }

  if (event.status === "completed") {
    return "Concluído";
  }

  return "Pendente";
}

function groupEventsByDay(events: AgendaCalendarEvent[]) {
  const map = new Map<string, AgendaCalendarEvent[]>();

  for (const event of events) {
    const key = toLocalDateKey(new Date(event.start));
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket);
  }

  return map;
}

function CancelAppointmentButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled || pending}
      className="inline-flex w-full items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2 font-semibold text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Cancelando..." : "Cancelar agendamento"}
    </button>
  );
}

export function AgendaCalendar({ monthKey, events }: Props) {
  const [pendingCancelIds, setPendingCancelIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<AgendaCalendarEvent | null>(null);

  const monthDate = useMemo(() => parseMonthKey(monthKey), [monthKey]);
  const today = useMemo(() => new Date(), []);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const visibleEvents = useMemo(
    () => events.filter((event) => !pendingCancelIds.has(event.id)),
    [events, pendingCancelIds],
  );

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const eventsMap = useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents],
  );
  const selectedDayDate = useMemo(() => {
    if (!selectedDayKey) {
      return null;
    }

    const [yearRaw, monthRaw, dayRaw] = selectedDayKey.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return null;
    }

    return new Date(year, month - 1, day);
  }, [selectedDayKey]);
  const selectedDayEvents = selectedDayKey
    ? (eventsMap.get(selectedDayKey) ?? [])
    : [];

  function handleCancelSubmit() {
    if (!selectedEvent || selectedEvent.isExternal) {
      return;
    }

    setPendingCancelIds((current) => new Set(current).add(selectedEvent.id));
  }

  return (
    <>
      <article className="surface-card p-4 md:p-6">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((weekDay) => (
            <div
              key={weekDay}
              className="rounded-xl bg-slate-100 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {weekDay}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dayKey = toLocalDateKey(day);
            const dayEvents = eventsMap.get(dayKey) ?? [];
            const outOfMonth = day.getMonth() !== monthDate.getMonth();
            const isToday = isSameDay(day, today);

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDayKey(dayKey)}
                className={`min-h-28 rounded-xl border p-2 text-left transition hover:border-primary/40 ${outOfMonth ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${outOfMonth ? "text-slate-400" : "text-foreground"}`}
                  >
                    {day.getDate()}
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Hoje
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`w-full rounded-lg px-2 py-1 text-xs ${getEventTone(event)}`}
                      title={`${event.summary} - ${formatHourLabel(event.start)}`}
                    >
                      <p className="truncate font-semibold leading-tight">
                        {formatHourLabel(event.start)} · {event.summary}
                      </p>
                    </div>
                  ))}
                  {dayEvents.length > 2 ? (
                    <p className="text-[11px] font-semibold text-muted">
                      +{dayEvents.length - 2} consulta(s)
                    </p>
                  ) : null}
                  {dayEvents.length === 0 ? (
                    <p className="text-[11px] text-muted">Sem consultas</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </article>

      {selectedDayDate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="surface-card w-full max-w-xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-secondary">
                  Consultas do dia
                </h3>
                <p className="mt-1 text-sm capitalize text-muted">
                  {formatDayLabel(selectedDayDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="btn-outline-modern px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-muted">
                  Nenhuma consulta cadastrada para este dia.
                </p>
              ) : (
                selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event);
                      setSelectedDayKey(null);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {formatHourLabel(event.start)} · {event.patientName}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {getStatusLabel(event)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {event.patientEmail}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="surface-card w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-secondary">
                  Detalhes da consulta
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {formatDateTime(selectedEvent.start)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="btn-outline-modern px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </p>
                <p className="font-medium text-foreground">
                  {getStatusLabel(selectedEvent)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Nome
                </p>
                <p className="font-medium text-foreground">
                  {selectedEvent.patientName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  E-mail
                </p>
                <p className="font-medium text-foreground">
                  {selectedEvent.patientEmail}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Telefone
                </p>
                <p className="font-medium text-foreground">
                  {selectedEvent.patientPhone}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {selectedEvent.isExternal ? (
                <p className="sm:col-span-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                  Evento vindo do Google Calendar. Para confirmar/cancelar com
                  e-mail, crie o agendamento pelo fluxo do ClinPé.
                </p>
              ) : (
                <>
                  <form action={confirmAppointmentAction}>
                    <input
                      type="hidden"
                      name="appointment_id"
                      value={selectedEvent.id}
                    />
                    <input type="hidden" name="month" value={monthKey} />
                    <button
                      type="submit"
                      disabled={
                        selectedEvent.status === "canceled" ||
                        selectedEvent.status === "completed" ||
                        selectedEvent.confirmationStatus === "confirmed" ||
                        selectedEvent.patientEmail === "Não informado"
                      }
                      className="btn-gradient w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirmar agendamento
                    </button>
                  </form>

                  <form action={cancelAppointmentAction}>
                    <input
                      type="hidden"
                      name="appointment_id"
                      value={selectedEvent.id}
                    />
                    <input type="hidden" name="month" value={monthKey} />
                    <CancelAppointmentButton
                      onClick={handleCancelSubmit}
                      disabled={
                        selectedEvent.status === "canceled" ||
                        selectedEvent.status === "completed" ||
                        selectedEvent.patientEmail === "Não informado"
                      }
                    />
                  </form>
                </>
              )}
            </div>

            {selectedEvent.patientEmail === "Não informado" ? (
              <p className="mt-3 text-xs text-warning">
                Este paciente não possui e-mail cadastrado. Atualize o cadastro
                antes de confirmar ou cancelar com notificação.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
