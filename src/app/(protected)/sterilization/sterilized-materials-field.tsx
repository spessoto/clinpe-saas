"use client";

import { useMemo, useState } from "react";

type Props = {
  options: string[];
};

export function SterilizedMaterialsField({ options }: Props) {
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<string[]>([]);

  const normalizedSet = useMemo(
    () => new Set(items.map((item) => item.trim().toLowerCase())),
    [items],
  );

  function addItem() {
    const value = draft.trim();
    if (!value) return;

    const key = value.toLowerCase();
    if (normalizedSet.has(key)) {
      setDraft("");
      return;
    }

    setItems((prev) => [...prev, value]);
    setDraft("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-1 text-sm">
      <span className="font-semibold text-foreground">
        Material esterilizado
      </span>

      <input type="hidden" name="material_name" value={items.join(" | ")} />

      <div className="flex items-stretch gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          list="sterilization-materials"
          placeholder="Ex.: Kit de alicates"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={addItem}
          aria-label="Adicionar material"
          className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/15"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Adicionar
        </button>
      </div>

      <datalist id="sterilization-materials">
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="text-sm text-foreground">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Excluir ${item}`}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/15"
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
                Excluir
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Adicione um ou mais materiais para este ciclo.
        </p>
      )}
    </div>
  );
}
