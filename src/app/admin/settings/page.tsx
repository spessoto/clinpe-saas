import { Suspense } from "react";

import {
  getHeadScripts,
  createHeadScriptAction,
  updateHeadScriptAction,
  type HeadScript,
} from "./actions";
import { DeleteScriptButton } from "./delete-script-button";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-secondary">
        Configurações
      </h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      {/* ── Add new script ────────────────────────────── */}
      <section className="surface-card p-6">
        <h2 className="mb-4 text-lg font-bold text-secondary">
          Adicionar script no &lt;head&gt;
        </h2>

        <form action={createHeadScriptAction} className="space-y-4">
          <div>
            <label
              htmlFor="new-label"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Rótulo (opcional)
            </label>
            <input
              id="new-label"
              name="label"
              type="text"
              placeholder="Ex.: Google Analytics, Meta Pixel"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="new-content"
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              Conteúdo do script
            </label>
            <textarea
              id="new-content"
              name="content"
              rows={5}
              placeholder={'<script async src="https://..."></script>'}
              className="w-full font-mono text-sm"
              required
            />
            <p className="mt-1 text-xs text-muted">
              Cole o snippet completo incluindo as tags &lt;script&gt;. Aceita
              múltiplas tags, meta tags, links de stylesheet, etc.
            </p>
          </div>

          <button
            type="submit"
            className="btn-gradient cursor-pointer px-5 py-2 text-sm"
          >
            Adicionar script
          </button>
        </form>
      </section>

      {/* ── Existing scripts table ────────────────────── */}
      <Suspense
        fallback={<div className="text-sm text-muted">Carregando scripts…</div>}
      >
        <ScriptsList />
      </Suspense>
    </div>
  );
}

async function ScriptsList() {
  const scripts = await getHeadScripts();

  if (scripts.length === 0) {
    return (
      <section className="surface-card p-6">
        <p className="text-sm text-muted">
          Nenhum script cadastrado ainda. Use o formulário acima para adicionar.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card divide-y divide-slate-100">
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-secondary">
          Scripts instalados ({scripts.length})
        </h2>
      </div>

      {scripts.map((s) => (
        <ScriptRow key={s.id} script={s} />
      ))}
    </section>
  );
}

function ScriptRow({ script }: { script: HeadScript }) {
  const dateLabel = new Date(script.updated_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <details className="group px-6 py-4">
      <summary className="flex cursor-pointer items-center gap-3">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${script.is_active ? "bg-success" : "bg-slate-300"}`}
          title={script.is_active ? "Ativo" : "Inativo"}
        />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {script.label || "(sem rótulo)"}
        </span>
        <span className="text-xs text-muted">{dateLabel}</span>
        <svg
          className="h-4 w-4 text-muted transition group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <form action={updateHeadScriptAction} className="mt-4 space-y-3">
        <input type="hidden" name="id" value={script.id} />

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">
            Rótulo
          </label>
          <input
            name="label"
            type="text"
            defaultValue={script.label}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">
            Conteúdo
          </label>
          <textarea
            name="content"
            rows={4}
            defaultValue={script.content}
            className="w-full font-mono text-xs"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={script.is_active}
            className="h-4 w-4 rounded border-slate-300 text-primary"
          />
          Ativo
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="btn-gradient cursor-pointer px-4 py-1.5 text-xs"
          >
            Salvar alterações
          </button>

          <DeleteScriptButton id={script.id} />
        </div>
      </form>
    </details>
  );
}
