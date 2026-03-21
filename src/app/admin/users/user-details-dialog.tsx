"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

import {
  enableClientPermanentFreeFromUsersAction,
  extendClientTrialAction,
  revokeClientPermanentFreeFromUsersAction,
} from "@/app/admin/users/actions";

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "staff";
  created_at: string;
  tenant_id: string;
  plan_label: string;
  renewal_date: string;
  renewal_days_left: number | null;
  client: {
    name: string;
    slug: string;
    created_at: string;
    max_patients_allowed: number;
    subscription_status: "trialing" | "active" | "past_due";
    is_permanent_free_plan: boolean;
    trial_extension_days: number;
  } | null;
  stats: {
    professionals: number;
    patients: number;
    appointments_month: number;
  };
};

interface UserDetailsDialogProps {
  user: AdminUserRow;
  currentPage: number;
  triggerVariant?: "name" | "icon";
}

function formatDate(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserDetailsDialog({
  user,
  currentPage,
  triggerVariant = "name",
}: UserDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <>
      {triggerVariant === "icon" ? (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={`Editar ${user.full_name}`}
          aria-label={`Editar ${user.full_name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="text-left font-semibold text-secondary underline-offset-2 hover:underline"
        >
          {user.full_name}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="w-full max-w-2xl rounded-2xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {user.full_name}
              </h3>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-muted hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Cliente
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {user.client?.name ?? "Sem cliente"}
            </p>
            <p className="mt-1 text-xs text-muted">
              /{user.client?.slug ?? "-"}
            </p>
            <p className="mt-2 text-xs text-muted">
              Cadastro do cliente:{" "}
              {user.client ? formatDate(user.client.created_at) : "-"}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Assinatura
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {user.plan_label}
            </p>
            <p className="mt-1 text-xs text-muted">
              Renovação:{" "}
              {user.renewal_date === "Sem vencimento"
                ? "Sem vencimento"
                : formatDate(user.renewal_date)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Dias restantes: {user.renewal_days_left ?? "-"}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Conta do usuário
            </p>
            <p className="mt-2 text-sm text-foreground">
              Função: <span className="font-semibold">{user.role}</span>
            </p>
            <p className="mt-1 text-sm text-foreground">
              Criado em:{" "}
              <span className="font-semibold">
                {formatDateTime(user.created_at)}
              </span>
            </p>
            <p className="mt-1 text-sm text-foreground">
              Tipo:{" "}
              <span className="font-semibold">
                {user.client?.subscription_status ?? "-"}
              </span>
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Indicadores (sem dados sensíveis)
            </p>
            <p className="mt-2 text-sm text-foreground">
              Profissionais:{" "}
              <span className="font-semibold">{user.stats.professionals}</span>
            </p>
            <p className="mt-1 text-sm text-foreground">
              Pacientes:{" "}
              <span className="font-semibold">{user.stats.patients}</span>
            </p>
            <p className="mt-1 text-sm text-foreground">
              Consultas no mês:{" "}
              <span className="font-semibold">
                {user.stats.appointments_month}
              </span>
            </p>
          </article>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-6 py-4">
          {/* Free permanente toggle */}
          {user.client?.is_permanent_free_plan === true ? (
            <form action={revokeClientPermanentFreeFromUsersAction}>
              <input type="hidden" name="tenant_id" value={user.tenant_id} />
              <input type="hidden" name="page" value={String(currentPage)} />
              <button
                type="submit"
                className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/15"
              >
                Remover Free Permanente
              </button>
            </form>
          ) : (
            <form action={enableClientPermanentFreeFromUsersAction}>
              <input type="hidden" name="tenant_id" value={user.tenant_id} />
              <input type="hidden" name="page" value={String(currentPage)} />
              <button
                type="submit"
                className="w-full rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success hover:bg-success/15"
              >
                Ativar free permanente
              </button>
            </form>
          )}

          {/* Mais tempo de trial */}
          <div>
            <button
              type="button"
              onClick={() => setTrialOpen((v) => !v)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-slate-100"
            >
              {trialOpen ? "Cancelar" : "Mais tempo de trial"}
            </button>

            {trialOpen && (
              <form
                action={extendClientTrialAction}
                className="mt-3 flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="tenant_id" value={user.tenant_id} />
                <input type="hidden" name="page" value={String(currentPage)} />
                <label className="flex-1 text-sm">
                  <span className="mb-1 block font-semibold text-foreground">
                    Dias extras
                    {user.client?.trial_extension_days
                      ? ` (acumulado atual: ${user.client.trial_extension_days} dia(s))`
                      : ""}
                  </span>
                  <input
                    type="number"
                    name="extra_days"
                    min={1}
                    max={365}
                    required
                    placeholder="Ex: 7"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
                >
                  Adicionar
                </button>
              </form>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
