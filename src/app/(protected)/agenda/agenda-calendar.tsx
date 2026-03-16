"use client";

import { useMemo, useState } from "react";

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
};

type Props = {
  monthDateIso: string;
  monthKey: string;
  events: AgendaCalendarEvent[];
};

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
    const key = new Date(event.start).toISOString().slice(0, 10);
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket);
  }

  return map;
}

export function AgendaCalendar({ monthDateIso, monthKey, events }: Props) {
  const [selectedEvent, setSelectedEvent] =
    useState<AgendaCalendarEvent | null>(null);

  const monthDate = useMemo(() => new Date(monthDateIso), [monthDateIso]);
  const today = useMemo(() => new Date(), []);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const eventsMap = useMemo(() => groupEventsByDay(events), [events]);

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
            const dayKey = day.toISOString().slice(0, 10);
            const dayEvents = eventsMap.get(dayKey) ?? [];
            const outOfMonth = day.getMonth() !== monthDate.getMonth();
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dayKey}
                className={`min-h-36 rounded-xl border p-2 ${outOfMonth ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`}
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
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full rounded-xl px-2 py-1 text-left text-xs ${getEventTone(event)}`}
                      title={`${event.summary} - ${formatHourLabel(event.start)}`}
                    >
                      <p className="truncate font-semibold">{event.summary}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <p>{formatHourLabel(event.start)}</p>
                        <span className="rounded-full bg-white/70 px-1.5 py-0.5 font-semibold">
                          {getStatusLabel(event)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="text-[11px] font-semibold text-muted">
                      +{dayEvents.length - 3} evento(s)
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </article>

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
                <button
                  type="submit"
                  disabled={
                    selectedEvent.status === "canceled" ||
                    selectedEvent.status === "completed" ||
                    selectedEvent.patientEmail === "Não informado"
                  }
                  className="inline-flex w-full items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2 font-semibold text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar agendamento
                </button>
              </form>
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
