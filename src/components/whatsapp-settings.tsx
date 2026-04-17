"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Template = {
  id: string;
  name: string;
  message_template: string;
  trigger_type: "hours_before" | "days_before";
  trigger_value: number;
  enabled: boolean;
  position: number;
};

type WhatsAppSettingsProps = {
  initialStatus: string | null;
  initialTemplates: Template[];
};

const AVAILABLE_VARS = [
  { key: "paciente", label: "Paciente" },
  { key: "clinica", label: "Clínica" },
  { key: "profissional", label: "Profissional" },
  { key: "data", label: "Data" },
  { key: "horario", label: "Horário" },
];

const DEFAULT_TEMPLATE_MSG =
  "Olá, {{paciente}}! 👋\n\nLembramos que você tem uma consulta agendada:\n📅 Data: {{data}}\n🕐 Horário: {{horario}}\n👨‍⚕️ Profissional: {{profissional}}\n🏥 {{clinica}}\n\nAgradecemos a preferência!";

export function WhatsAppSettings({
  initialStatus,
  initialTemplates,
}: WhatsAppSettingsProps) {
  const [status, setStatus] = useState(initialStatus ?? "disconnected");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [saving, setSaving] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status !== "qrcode") {
      stopPolling();
      return;
    }

    const poll = async () => {
      try {
        const statusRes = await fetch("/api/whatsapp/instance/status");
        const statusData = await statusRes.json();

        if (statusData.status === "connected") {
          setStatus("connected");
          setQrBase64(null);
          stopPolling();
          return;
        }

        const qrRes = await fetch("/api/whatsapp/instance/qrcode");
        const qrData = await qrRes.json();
        if (qrData.base64) {
          setQrBase64(qrData.base64);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, 4000);

    return stopPolling;
  }, [status, stopPolling]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/instance", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao conectar.");
        return;
      }

      setStatus("qrcode");
      if (data.qrcode) {
        setQrBase64(data.qrcode);
      }
    } catch {
      setError("Erro de rede ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/instance", { method: "DELETE" });
      if (res.ok) {
        setStatus("disconnected");
        setQrBase64(null);
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao desconectar.");
      }
    } catch {
      setError("Erro de rede ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (templates.length >= 3) return;

    setSaving("new");
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Lembrete ${templates.length + 1}`,
          message_template: DEFAULT_TEMPLATE_MSG,
          trigger_type: "hours_before",
          trigger_value: 24,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates((prev) => [...prev, data]);
      } else {
        setError(data.error ?? "Erro ao criar template.");
      }
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    updates: Partial<Template>,
  ) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/whatsapp/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)));
      } else {
        setError(data.error ?? "Erro ao salvar template.");
      }
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/whatsapp/templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao excluir template.");
      }
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Section */}
      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">WhatsApp</h3>
        <p className="mt-1 text-sm text-muted">
          Conecte seu WhatsApp para enviar lembretes automáticos de consulta.
        </p>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4">
          {status === "disconnected" && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className="btn-gradient inline-flex items-center gap-2 px-5 py-2 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {loading ? "Conectando..." : "Conectar WhatsApp"}
            </button>
          )}

          {status === "qrcode" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  Aguardando leitura do QR Code
                </span>
              </div>

              {qrBase64 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <img
                      src={
                        qrBase64.startsWith("data:")
                          ? qrBase64
                          : `data:image/png;base64,${qrBase64}`
                      }
                      alt="QR Code WhatsApp"
                      className="h-64 w-64"
                    />
                  </div>
                  <p className="max-w-xs text-center text-sm text-muted">
                    Abra o WhatsApp no seu celular → Menu → Aparelhos conectados
                    → Conectar um aparelho → Escaneie este código.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">Carregando QR code...</p>
              )}

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="text-sm text-destructive underline hover:no-underline disabled:opacity-50"
              >
                Cancelar conexão
              </button>
            </div>
          )}

          {status === "connected" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-semibold text-green-700">
                  WhatsApp conectado
                </span>
              </div>
              <p className="text-sm text-muted">
                Lembretes automáticos serão enviados conforme os templates
                abaixo.
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
              >
                {loading ? "Desconectando..." : "Desconectar WhatsApp"}
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Templates Section */}
      <article className="surface-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary">
              Templates de lembrete
            </h3>
            <p className="mt-1 text-sm text-muted">
              Configure até 3 mensagens automáticas antes das consultas.
            </p>
          </div>
          {templates.length < 3 && (
            <button
              type="button"
              onClick={handleAddTemplate}
              disabled={saving === "new"}
              className="btn-gradient px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving === "new" ? "Criando..." : "+ Novo template"}
            </button>
          )}
        </div>

        {templates.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            Nenhum template configurado. Crie um para começar a enviar
            lembretes.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              saving={saving === tpl.id}
              onUpdate={(updates) => handleUpdateTemplate(tpl.id, updates)}
              onDelete={() => handleDeleteTemplate(tpl.id)}
            />
          ))}
        </div>
      </article>
    </div>
  );
}

function TemplateCard({
  template,
  saving,
  onUpdate,
  onDelete,
}: {
  template: Template;
  saving: boolean;
  onUpdate: (updates: Partial<Template>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [msg, setMsg] = useState(template.message_template);
  const [triggerType, setTriggerType] = useState(template.trigger_type);
  const [triggerValue, setTriggerValue] = useState(template.trigger_value);
  const [enabled, setEnabled] = useState(template.enabled);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (varKey: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = `{{${varKey}}}`;
    const newVal = msg.slice(0, start) + text + msg.slice(end);
    setMsg(newVal);
    setDirty(true);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const handleSave = () => {
    onUpdate({
      name,
      message_template: msg,
      trigger_type: triggerType,
      trigger_value: triggerValue,
      enabled,
    });
    setDirty(false);
  };

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    onUpdate({ enabled: next });
  };

  const triggerLabel =
    triggerType === "hours_before"
      ? `${triggerValue} hora${triggerValue > 1 ? "s" : ""} antes`
      : `${triggerValue} dia${triggerValue > 1 ? "s" : ""} antes`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          maxLength={100}
          className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none ring-primary/40 focus:ring-2"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              enabled ? "bg-green-500" : "bg-slate-300"
            }`}
            title={enabled ? "Ativo" : "Inativo"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title="Excluir template"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Enviar</span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={72}
              value={triggerValue}
              onChange={(e) => {
                setTriggerValue(Number(e.target.value) || 1);
                setDirty(true);
              }}
              className="w-20 rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none ring-primary/40 focus:ring-2"
            />
            <select
              value={triggerType}
              onChange={(e) => {
                setTriggerType(
                  e.target.value as "hours_before" | "days_before",
                );
                setDirty(true);
              }}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none ring-primary/40 focus:ring-2"
            >
              <option value="hours_before">horas antes</option>
              <option value="days_before">dias antes</option>
            </select>
          </div>
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-foreground">Disparo</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {triggerLabel}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-sm text-foreground">Mensagem</span>
        <div className="mb-2 flex flex-wrap gap-1">
          {AVAILABLE_VARS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVar(v.key)}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
            >
              {`{{${v.key}}}`}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={msg}
          onChange={(e) => {
            setMsg(e.target.value);
            setDirty(true);
          }}
          rows={6}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
        />
      </div>

      {dirty && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gradient px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar template"}
          </button>
        </div>
      )}
    </div>
  );
}
