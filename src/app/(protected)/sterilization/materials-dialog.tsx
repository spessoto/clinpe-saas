"use client";

import { useState } from "react";

type Props = {
  monthKey: string;
  action: (formData: FormData) => void | Promise<void>;
  existingNames: string[];
};

export function MaterialsDialog({ monthKey, action, existingNames }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-outline-modern w-full text-center sm:w-auto"
      >
        Cadastrar material
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="surface-card w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-secondary">
                  Novo material
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Cadastre o nome do material para facilitar o registro dos
                  ciclos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-outline-modern px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            <form action={action} className="mt-4 grid gap-3">
              <input type="hidden" name="month" value={monthKey} />

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">
                  Nome do material
                </span>
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Ex.: Kit de alicates"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-outline-modern"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-gradient">
                  Salvar material
                </button>
              </div>
            </form>

            {existingNames.length > 0 ? (
              <div className="mt-4 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Já cadastrados
                </p>
                <p className="mt-1 text-xs text-muted">
                  {existingNames.slice(0, 8).join(", ")}
                  {existingNames.length > 8 ? "..." : ""}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
