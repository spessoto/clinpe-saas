"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface DatePickerProps {
  professionalSlug: string;
  selectedDate: string;
}

const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

function parseDateParam(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toDateParam(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function DatePicker({
  professionalSlug,
  selectedDate,
}: DatePickerProps) {
  const router = useRouter();
  const selected = parseDateParam(selectedDate);
  const monthStart = startOfMonth(selected);
  const monthEnd = endOfMonth(selected);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingEmptyDays = (getDay(monthStart) + 6) % 7;
  const trailingEmptyDays =
    (7 - ((leadingEmptyDays + monthDays.length) % 7)) % 7;

  function navigateToDate(value: Date) {
    router.replace(`/${professionalSlug}?date=${toDateParam(value)}`, {
      scroll: false,
    });
  }

  function handleMonthChange(direction: "previous" | "next") {
    const targetMonth =
      direction === "previous"
        ? subMonths(selected, 1)
        : addMonths(selected, 1);
    const lastDayOfTargetMonth = endOfMonth(targetMonth).getDate();
    const nextDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      Math.min(selected.getDate(), lastDayOfTargetMonth),
    );

    navigateToDate(nextDate);
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Calendário
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {format(selected, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMonthChange("previous")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-foreground hover:border-primary/30 hover:bg-primary/5"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleMonthChange("next")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-foreground hover:border-primary/30 hover:bg-primary/5"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2.5 text-center">
        {weekDays.map((day) => (
          <span
            key={day}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
          >
            {day}
          </span>
        ))}

        {Array.from({ length: leadingEmptyDays }).map((_, index) => (
          <span key={`leading-${index}`} className="h-12 rounded-2xl" />
        ))}

        {monthDays.map((day) => {
          const isSelected = isSameDay(day, selected);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => navigateToDate(day)}
              className={[
                "h-12 rounded-2xl text-sm font-semibold transition",
                isSelected
                  ? "bg-primary text-white shadow-[0_12px_24px_-18px_rgba(15,143,135,0.9)]"
                  : "bg-slate-100 text-foreground hover:bg-primary/10 hover:text-primary",
              ].join(" ")}
              aria-pressed={isSelected}
            >
              {format(day, "d")}
            </button>
          );
        })}

        {Array.from({ length: trailingEmptyDays }).map((_, index) => (
          <span key={`trailing-${index}`} className="h-12 rounded-2xl" />
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        Data selecionada:{" "}
        {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
    </div>
  );
}
