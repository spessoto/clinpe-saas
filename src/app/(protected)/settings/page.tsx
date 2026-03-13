import Link from "next/link";

import { saveSettingsAction } from "@/app/(protected)/settings/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type UserSettings = {
  profile_photo_url: string | null;
  working_days: number[] | null;
  working_start_time: string | null;
  working_end_time: string | null;
  appointment_duration_minutes: number | null;
};

function slugifyProfessionalName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTimeInput(value: string | null, fallback: string) {
  const source = value ?? fallback;
  return source.slice(0, 5);
}

const weekDayOptions = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" },
];

const durationOptions = [30, 45, 60, 90, 120];

export default async function SettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const withSettings = await supabase
    .from("users")
    .select(
      "profile_photo_url, working_days, working_start_time, working_end_time, appointment_duration_minutes",
    )
    .eq("id", appUser.id)
    .eq("tenant_id", appUser.tenant_id)
    .maybeSingle();

  const userSettings = (withSettings.data as UserSettings | null) ?? {
    profile_photo_url: null,
    working_days: [1, 2, 3, 4, 5],
    working_start_time: "09:00:00",
    working_end_time: "17:00:00",
    appointment_duration_minutes: 60,
  };

  const workingDays = userSettings.working_days ?? [1, 2, 3, 4, 5];
  const professionalSlug =
    appUser.booking_slug ?? slugifyProfessionalName(appUser.full_name);
  const publicBookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${professionalSlug}`;

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("google_email, updated_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-secondary">Configuracoes</h2>
        <p className="mt-1 text-sm text-muted">
          Personalize seu perfil e o atendimento white-label de agendamento.
        </p>

        {success ? (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </article>

      <form action={saveSettingsAction} className="space-y-6">
        <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">Perfil</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-foreground">Foto de perfil</span>
              {userSettings.profile_photo_url ? (
                <img
                  src={userSettings.profile_photo_url}
                  alt="Foto de perfil"
                  className="mb-3 h-20 w-20 rounded-full border border-slate-200 object-cover"
                />
              ) : null}
              <input
                type="file"
                name="profile_photo"
                accept="image/*"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
              />
              <input
                type="hidden"
                name="current_profile_photo_url"
                value={userSettings.profile_photo_url ?? ""}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Nome da clinica
              </span>
              <input
                name="clinic_name"
                required
                defaultValue={tenant.name}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Nome do usuario
              </span>
              <input
                name="full_name"
                required
                defaultValue={appUser.full_name}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-foreground">
                E-mail do usuario
              </span>
              <input
                type="email"
                name="email"
                required
                defaultValue={appUser.email}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">
            Agenda de atendimento
          </h3>
          <p className="mt-1 text-sm text-muted">
            Defina dias, horario e tempo da consulta para gerar os horarios no
            autoagendamento.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Inicio do atendimento
              </span>
              <input
                type="time"
                name="working_start_time"
                required
                defaultValue={toTimeInput(
                  userSettings.working_start_time,
                  "09:00",
                )}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Fim do atendimento
              </span>
              <input
                type="time"
                name="working_end_time"
                required
                defaultValue={toTimeInput(
                  userSettings.working_end_time,
                  "17:00",
                )}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Tempo de consulta
              </span>
              <select
                name="appointment_duration_minutes"
                defaultValue={String(
                  userSettings.appointment_duration_minutes ?? 60,
                )}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              >
                {durationOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60
                      ? `${minutes} min`
                      : `${Math.floor(minutes / 60)}h${minutes % 60 ? `:${String(minutes % 60).padStart(2, "0")}` : ""}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              Dias de atendimento
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {weekDayOptions.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="working_days"
                    value={day.value}
                    defaultChecked={workingDays.includes(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">
            Integracao Google
          </h3>
          <p className="mt-1 text-sm text-muted">
            O formulario white-label desta aplicacao cria consultas no sistema e
            sincroniza com seu Google Calendar automaticamente.
          </p>

          <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-muted">
            {integration ? (
              <>
                <p className="font-semibold text-foreground">
                  Conta conectada:{" "}
                  {integration.google_email ?? "Google conectado"}
                </p>
                <p className="mt-1">
                  Ultima atualizacao:{" "}
                  {integration.updated_at
                    ? new Date(integration.updated_at).toLocaleString("pt-BR")
                    : "Nao informada"}
                </p>
              </>
            ) : (
              <p>Nenhuma conta Google conectada.</p>
            )}
          </div>

          <Link
            href="/api/google/connect"
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            {integration
              ? "Reconectar Google Calendar"
              : "Conectar Google Calendar"}
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary">
            Link publico de agendamento
          </h3>
          <p className="mt-2 text-sm text-muted">
            Compartilhe este link com seus pacientes.
          </p>
          <p className="mt-3 rounded-md bg-slate-50 px-4 py-3 text-sm text-foreground">
            {publicBookingUrl}
          </p>
        </article>

        <button
          type="submit"
          className="rounded-md bg-secondary px-5 py-2 text-sm font-semibold text-white hover:bg-secondary/90"
        >
          Salvar configuracoes
        </button>
      </form>
    </section>
  );
}
