import Image from "next/image";

import { createPublicBookingAction } from "@/app/public-booking-actions";
import { DatePicker } from "./date-picker";
import {
  diagnosePublicProfessionalBooking,
  getAvailableSlots,
  getPublicProfessionalBookingContext,
} from "@/lib/booking";

type Props = {
  params: Promise<{ professional_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getProfessionalInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function UnavailableBookingPage({ message }: { message: string }) {
  return (
    <main className="bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fafc,white)] px-6 py-12">
      <section className="surface-card mx-auto max-w-4xl border-warning/40 p-8">
        <h1 className="text-3xl font-bold text-secondary">
          Agendamento indisponível
        </h1>
        <p className="mt-3 text-muted">{message}</p>
        <p className="mt-4 text-sm text-muted">
          Assim que a configuração for concluída, esta página exibirá os dados
          do profissional, da clínica e os horários de atendimento do formulário
          white-label.
        </p>
      </section>
    </main>
  );
}

export default async function ProfessionalBookingPage({
  params,
  searchParams,
}: Props) {
  const { professional_slug } = await params;
  const search = await searchParams;

  const success = typeof search.success === "string" ? search.success : null;
  const error = typeof search.error === "string" ? search.error : null;
  const selectedDate =
    typeof search.date === "string"
      ? search.date
      : new Date().toISOString().slice(0, 10);

  let context;

  try {
    context = await getPublicProfessionalBookingContext(professional_slug);
  } catch (bookingError) {
    const message =
      bookingError instanceof Error
        ? bookingError.message
        : "Página de agendamento indisponível";

    return <UnavailableBookingPage message={message} />;
  }

  if (!context) {
    const diagnostic =
      await diagnosePublicProfessionalBooking(professional_slug);
    let message =
      "Não foi possível localizar o profissional de agendamento para este link.";

    if (diagnostic.status === "professional_not_found") {
      message =
        "Nenhum profissional foi encontrado com este link. Verifique se o booking_slug do usuário está preenchido no Supabase.";
    }

    if (diagnostic.status === "tenant_not_found") {
      message =
        "O profissional foi encontrado, mas a clínica vinculada não foi localizada no banco.";
    }

    if (diagnostic.status === "booking_disabled") {
      message = `O autoagendamento está desativado para a clínica ${diagnostic.tenantName}. Ative booking_enabled na tabela tenants.`;
    }

    if (diagnostic.status === "subscription_inactive") {
      message = `A assinatura da clínica ${diagnostic.tenantName} está vencida ou inativa. O autoagendamento público fica bloqueado até a regularização.`;
    }

    return <UnavailableBookingPage message={message} />;
  }

  const initials = getProfessionalInitials(context.professional.full_name);

  const slots = await getAvailableSlots({
    tenantSlug: context.tenant.slug,
    professionalId: context.professional.id,
    date: selectedDate,
  });

  const selectedDateLabel = new Date(
    `${selectedDate}T00:00:00`,
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-[#f3f7f8] px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <header>
              <h1 className="text-4xl font-bold">Agende sua consulta</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Siga as etapas abaixo para reservar seu horário com nosso
                especialista em podologia.
              </p>
            </header>

            {success ? (
              <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <form action={createPublicBookingAction} className="space-y-6">
              <input
                type="hidden"
                name="tenant_slug"
                value={context.tenant.slug}
              />
              <input
                type="hidden"
                name="return_path"
                value={`/${professional_slug}`}
              />
              <input
                type="hidden"
                name="professional_id"
                value={context.professional.id}
              />

              <article className="soft-panel p-5">
                <p className="text-sm font-semibold text-secondary">
                  1. Serviço selecionado
                </p>
                <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <p className="font-semibold text-foreground">
                    Consulta podológica
                  </p>
                  <p className="text-sm text-muted">
                    Atendimento personalizado para saúde dos pés.
                  </p>
                </div>
              </article>

              <article className="soft-panel p-5">
                <p className="text-sm font-semibold text-secondary">
                  2. Especialista
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                  {context.professional.profile_photo_url ? (
                    <Image
                      src={context.professional.profile_photo_url}
                      alt={context.professional.full_name}
                      width={52}
                      height={52}
                      className="h-13 w-13 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-13 w-13 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {context.professional.full_name}
                    </p>
                    <p className="text-sm text-muted">
                      {context.professional.professional_register ??
                        "Registro não informado"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="soft-panel p-5">
                <p className="text-sm font-semibold text-secondary">
                  3. Data e horário
                </p>

                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                  <DatePicker
                    professionalSlug={professional_slug}
                    selectedDate={selectedDate}
                  />

                  <fieldset className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] sm:p-5">
                    <legend className="px-1 text-sm font-semibold text-foreground">
                      Horários disponíveis
                    </legend>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                      {selectedDateLabel}
                    </p>

                    <div className="mt-4 flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <label key={slot} className="block cursor-pointer">
                          <input
                            type="radio"
                            name="scheduled_at"
                            value={slot}
                            required
                            className="peer sr-only"
                          />
                          <span className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                            {new Date(slot).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </label>
                      ))}
                      {slots.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted">
                          Não há horários livres para esta data.
                        </p>
                      ) : null}
                    </div>
                  </fieldset>
                </div>
              </article>

              <article className="soft-panel p-5">
                <p className="text-sm font-semibold text-secondary">
                  4. Dados pessoais
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-foreground">
                      Nome completo
                    </span>
                    <input
                      name="patient_name"
                      required
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-foreground">Celular</span>
                    <input
                      name="patient_phone"
                      required
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-1 block text-foreground">E-mail</span>
                    <input
                      type="email"
                      name="patient_email"
                      required
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-1 block text-foreground">
                      Breve descrição do problema (opcional)
                    </span>
                    <textarea
                      name="issue_description"
                      rows={3}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={slots.length === 0}
                  className="btn-gradient mt-4 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirmar agendamento
                </button>
              </article>
            </form>
          </section>

          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <article className="surface-card p-5">
              <h2 className="text-lg font-bold text-secondary">
                Resumo do agendamento
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Serviço</dt>
                  <dd className="font-semibold text-foreground">
                    Consulta podológica
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Profissional</dt>
                  <dd className="font-semibold text-foreground">
                    {context.professional.full_name}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Clínica</dt>
                  <dd className="font-semibold text-foreground">
                    {context.tenant.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Data</dt>
                  <dd className="font-semibold capitalize text-foreground">
                    {selectedDateLabel}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                Sua confirmação cria o horário no sistema e sincroniza na agenda
                do profissional.
              </div>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}
