"use client";

import { useRef } from "react";
import { deleteHeadScriptAction } from "./actions";

export function DeleteScriptButton({ id }: { id: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={deleteHeadScriptAction}
      onSubmit={(e) => {
        if (!confirm("Excluir este script?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="cursor-pointer rounded-xl border border-red-200 px-4 py-1.5 text-xs font-semibold text-destructive transition hover:bg-red-50"
      >
        Excluir
      </button>
    </form>
  );
}
