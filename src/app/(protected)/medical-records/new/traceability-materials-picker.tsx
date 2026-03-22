"use client";

import { useMemo, useState } from "react";

type TraceabilityEntry = {
  entryId: string;
  lotId: string;
  batchNumber: string;
  material: string;
};

type Props = {
  entries: TraceabilityEntry[];
};

export function TraceabilityMaterialsPicker({ entries }: Props) {
  const [draftEntryId, setDraftEntryId] = useState("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  const availableEntries = useMemo(
    () => entries.filter((entry) => !selectedEntryIds.includes(entry.entryId)),
    [entries, selectedEntryIds],
  );

  const selectedEntries = useMemo(
    () =>
      selectedEntryIds
        .map((entryId) => entries.find((entry) => entry.entryId === entryId))
        .filter((entry): entry is TraceabilityEntry => Boolean(entry)),
    [entries, selectedEntryIds],
  );

  function addEntry() {
    if (!draftEntryId) return;

    setSelectedEntryIds((prev) => [...prev, draftEntryId]);
    setDraftEntryId("");
  }

  function removeEntry(entryId: string) {
    setSelectedEntryIds((prev) => prev.filter((id) => id !== entryId));
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={draftEntryId}
          onChange={(event) => setDraftEntryId(event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
        >
          <option value="">Selecione material e lote...</option>
          {availableEntries.map((entry) => (
            <option key={entry.entryId} value={entry.entryId}>
              {entry.material} • Lote {entry.batchNumber}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addEntry}
          className="btn-outline-modern"
          disabled={!draftEntryId}
        >
          Adicionar
        </button>
      </div>

      {availableEntries.length === 0 ? (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-muted">
          Todos os materiais disponíveis já foram adicionados.
        </p>
      ) : null}

      {selectedEntries.length > 0 ? (
        <ul className="grid gap-2">
          {selectedEntries.map((entry) => (
            <li
              key={entry.entryId}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <input
                type="hidden"
                name="sterilization_lot_ids"
                value={entry.lotId}
              />
              <input
                type="hidden"
                name="sterilization_material_entries"
                value={JSON.stringify({
                  lotId: entry.lotId,
                  batchNumber: entry.batchNumber,
                  material: entry.material,
                })}
              />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {entry.material}
                </p>
                <p className="text-xs text-muted">Lote {entry.batchNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => removeEntry(entry.entryId)}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/15"
                aria-label={`Remover ${entry.material}`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12m4-12v12m5-12v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10z"
                  />
                </svg>
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">Nenhum material selecionado ainda.</p>
      )}
    </div>
  );
}
