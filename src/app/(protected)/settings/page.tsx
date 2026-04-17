import { saveSettingsAction } from "@/app/(protected)/settings/actions";
import { ImageUpload } from "@/components/image-upload";
import { WhatsAppSettings } from "@/components/whatsapp-settings";
import { requireActiveTenant } from "@/lib/auth";
import { formatBrazilTaxId } from "@/lib/brazil-tax-id";
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
  lunch_start_time: string | null;
  lunch_end_time: string | null;
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
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const durationOptions = [30, 45, 60, 90, 120];

export default async function SettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();

  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { data: tenantBranding } = await supabase
    .from("tenants")
    .select("name, logo_url, cpf_cnpj")
    .eq("id", tenant.id)
    .maybeSingle();

  const clinicName = tenantBranding?.name ?? tenant.name;
  const clinicLogoUrl = tenantBranding?.logo_url ?? tenant.logo_url;
  const billingDocument = tenantBranding?.cpf_cnpj ?? tenant.cpf_cnpj;

  const withSettings = await supabase
    .from("users")
    .select(
      "profile_photo_url, working_days, working_start_time, working_end_time, appointment_duration_minutes, lunch_start_time, lunch_end_time",
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
    lunch_start_time: null,
    lunch_end_time: null,
  };

  const { data: whatsappTemplates } = await supabase
    .from("whatsapp_reminder_templates")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("position");

  const { data: whatsappEventTemplates } = await supabase
    .from("whatsapp_event_templates")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("event_type");

  const hasLunchBreak = Boolean(userSettings.lunch_start_time);

  const workingDays = userSettings.working_days ?? [1, 2, 3, 4, 5];
  const professionalSlug =
    appUser.booking_slug ?? slugifyProfessionalName(appUser.full_name);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://pododesk.com.br"
      : "http://localhost:3000");
  const publicBookingUrl = `${appUrl}/${professionalSlug}`;

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <h2 className="text-2xl font-bold">Configurações</h2>
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
        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">Perfil</h3>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <ImageUpload
              type="avatar"
              currentUrl={appUser.avatar_url}
              label="Avatar do Profissional"
              className="md:col-span-1"
            />

            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Nome do usuário
                </span>
                <input
                  name="full_name"
                  required
                  defaultValue={appUser.full_name}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Resumo profissional
                </span>
                <textarea
                  name="bio"
                  maxLength={200}
                  defaultValue={appUser.bio || ""}
                  placeholder="Breve descrição para a página pública de agendamento"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
                  rows={3}
                />
                <p className="mt-1 text-xs text-muted">Até 200 caracteres</p>
              </label>
            </div>
          </div>
        </article>

        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">Clínica</h3>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <ImageUpload
              type="logo"
              currentUrl={clinicLogoUrl}
              label="Logo da Clínica"
              className="md:col-span-1"
            />

            <div>
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Nome da clínica
                </span>
                <input
                  name="clinic_name"
                  required
                  defaultValue={clinicName}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm mt-4">
                <span className="mb-1 block text-foreground">
                  E-mail do usuário
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={appUser.email}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>

              <label className="block text-sm mt-4">
                <span className="mb-1 block text-foreground">
                  CPF ou CNPJ para faturamento
                </span>
                <input
                  name="cpf_cnpj"
                  defaultValue={formatBrazilTaxId(billingDocument)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
                <p className="mt-1 text-xs text-muted">
                  Obrigatório para gerar cobranças e assinaturas no Asaas.
                </p>
              </label>
            </div>
          </div>
        </article>

        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Agenda de atendimento
          </h3>
          <p className="mt-1 text-sm text-muted">
            Defina dias, horário e tempo da consulta para gerar os horários no
            autoagendamento.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Início do atendimento
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
              Horário de almoço
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="has_lunch_break"
                value="1"
                defaultChecked={hasLunchBreak}
              />
              <span>Definir horário de almoço</span>
            </label>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Início do almoço
                </span>
                <input
                  type="time"
                  name="lunch_start_time"
                  defaultValue={toTimeInput(
                    userSettings.lunch_start_time,
                    "12:00",
                  )}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Fim do almoço
                </span>
                <input
                  type="time"
                  name="lunch_end_time"
                  defaultValue={toTimeInput(
                    userSettings.lunch_end_time,
                    "13:00",
                  )}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              Dias de atendimento
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {weekDayOptions.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm"
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

        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Link público de agendamento
          </h3>
          <p className="mt-2 text-sm text-muted">
            Compartilhe este link com seus pacientes.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-foreground">
            {publicBookingUrl}
          </p>
        </article>

        <button type="submit" className="btn-gradient px-5 py-2">
          Salvar configurações
        </button>
      </form>

      <WhatsAppSettings
        initialStatus={tenant.whatsapp_status}
        initialTemplates={whatsappTemplates ?? []}
        initialEventTemplates={whatsappEventTemplates ?? []}
      />
    </section>
  );
}
