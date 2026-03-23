"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createManualAppointmentAction } from "@/app/(protected)/agenda/actions";

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  monthKey: string;
  initialDate: string;
  open: boolean;
  onClose: () => void;
};

function formatSlotLabel(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewAppointmentDialog({
  monthKey,
  initialDate,
  open,
  onClose,
}: Props) {
  const [patientMode, setPatientMode] = useState<"existing" | "new">(
    "existing",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Search patients with debounce
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = (await response.json()) as Patient[];
        setSearchResults(data);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void searchPatients(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchPatients]);

  // Load available slots when dialog opens with a date
  useEffect(() => {
    if (!open || !initialDate) {
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot("");
    setAvailableSlots([]);

    fetch(`/api/agenda/slots?date=${initialDate}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) {
          setAvailableSlots(data as string[]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialDate]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPatientMode("existing");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPatient(null);
      setSelectedSlot("");
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const dateLabel = initialDate
    ? new Date(
        Number(initialDate.slice(0, 4)),
        Number(initialDate.slice(5, 7)) - 1,
        Number(initialDate.slice(8, 10)),
      ).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  function handleSubmit() {
    setIsSubmitting(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="surface-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-secondary">Nova consulta</h3>
            <p className="mt-1 text-sm capitalize text-muted">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline-modern px-2 py-1 text-xs"
          >
            Fechar
          </button>
        </div>

        <form
          ref={formRef}
          action={createManualAppointmentAction}
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="month" value={monthKey} />
          <input type="hidden" name="patient_mode" value={patientMode} />
          {selectedPatient && patientMode === "existing" ? (
            <input type="hidden" name="patient_id" value={selectedPatient.id} />
          ) : null}
          <input type="hidden" name="scheduled_at" value={selectedSlot} />

          {/* Patient mode toggle */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-foreground">
              Paciente
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPatientMode("existing");
                  setSelectedPatient(null);
                }}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  patientMode === "existing"
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-muted hover:bg-slate-200"
                }`}
              >
                Paciente existente
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMode("new");
                  setSelectedPatient(null);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  patientMode === "new"
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-muted hover:bg-slate-200"
                }`}
              >
                Novo paciente
              </button>
            </div>
          </fieldset>

          {patientMode === "existing" ? (
            <div>
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Buscar por nome ou telefone
                </span>
                <input
                  type="text"
                  value={searchQuery ?? ""}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedPatient(null);
                  }}
                  placeholder="Digite pelo menos 2 caracteres..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              {isSearching ? (
                <p className="mt-2 text-xs text-muted">Buscando...</p>
              ) : null}

              {selectedPatient ? (
                <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPatient.name}
                  </p>
                  <p className="text-xs text-muted">
                    {selectedPatient.phone ?? "Sem telefone"}{" "}
                    {selectedPatient.email ? `· ${selectedPatient.email}` : ""}
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setSearchResults([]);
                        setSearchQuery(patient.name);
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-primary/5"
                    >
                      <p className="font-semibold text-foreground">
                        {patient.name}
                      </p>
                      <p className="text-xs text-muted">
                        {patient.phone ?? ""}{" "}
                        {patient.email ? `· ${patient.email}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <p className="mt-2 text-xs text-muted">
                  Nenhum paciente encontrado.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Nome do paciente *
                </span>
                <input
                  type="text"
                  name="new_patient_name"
                  required={patientMode === "new"}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Telefone *</span>
                <input
                  type="tel"
                  name="new_patient_phone"
                  required={patientMode === "new"}
                  placeholder="(11) 99999-0000"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  E-mail (opcional)
                </span>
                <input
                  type="email"
                  name="new_patient_email"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                />
              </label>
            </div>
          )}

          {/* Time slot selection */}
          <div className="space-y-3">
            {loadingSlots ? (
              <p className="text-xs text-muted">Carregando horários...</p>
            ) : availableSlots.length > 0 ? (
              <div>
                <p className="mb-1 text-sm font-semibold text-foreground">
                  Horários disponíveis
                </p>
                <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                        selectedSlot === slot
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-foreground hover:bg-primary/10"
                      }`}
                    >
                      {formatSlotLabel(slot)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-warning">
                Nenhum horário disponível para esta data.
              </p>
            )}
          </div>

          {/* Return checkbox */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_return" value="1" />
            <span>É retorno</span>
          </label>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedSlot ||
              (patientMode === "existing" && !selectedPatient)
            }
            className="btn-gradient w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar consulta"}
          </button>
        </form>
      </div>
    </div>
  );
}
