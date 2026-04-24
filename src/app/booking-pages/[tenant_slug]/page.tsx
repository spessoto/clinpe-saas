import Image from "next/image";

import {
  RecaptchaForm,
  RecaptchaSubmitButton,
} from "@/app/(auth)/recaptcha-form";
import { createPublicBookingAction } from "@/app/public-booking-actions";
import {
  diagnosePublicBooking,
  getAvailableSlots,
  getPublicBookingContext,
} from "@/lib/booking";
import { BookingFilters } from "./booking-filters";

function UnavailableBookingPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="surface-card w-full max-w-lg border-warning/40 p-8">
        <h1 className="text-2xl font-bold text-secondary">
          Autoagendamento indisponível
        </h1>
        <p className="mt-3 text-muted">{message}</p>
      </section>
    </main>
  );
}

type Props = {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { tenant_slug } = await params;
  const search = await searchParams;
  const success = typeof search.success === "string" ? search.success : null;
  const error = typeof search.error === "string" ? search.error : null;
  const selectedProfessionalId =
    typeof search.professional_id === "string" ? search.professional_id : "";
  const selectedDate =
    typeof search.date === "string"
      ? search.date
      : new Date().toISOString().slice(0, 10);

  let context;
  try {
    context = await getPublicBookingContext(tenant_slug);
  } catch (bookingError) {
    const message =
      bookingError instanceof Error
        ? bookingError.message
        : "Booking público não configurado";
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <section className="surface-card w-full max-w-lg border-warning/30 p-8">
          <h1 className="text-2xl font-bold text-secondary">
            Autoagendamento indisponível
          </h1>
          <p className="mt-3 text-muted">{message}</p>
        </section>
      </main>
    );
  }

  if (!context || !context.tenant.booking_enabled) {
    const diagnostic = await diagnosePublicBooking(tenant_slug);
    let message =
      "Não foi possível localizar a página de agendamento para este link.";
    if (diagnostic.status === "tenant_not_found") {
      message =
        "Nenhuma clínica foi encontrada para este endereço. Verifique o link e tente novamente.";
    } else if (diagnostic.status === "booking_disabled") {
      message = `O autoagendamento está desativado para a clínica ${diagnostic.tenantName}. Entre em contato diretamente para agendar.`;
    } else if (diagnostic.status === "subscription_inactive") {
      message = `A assinatura da clínica ${diagnostic.tenantName} está vencida ou inativa. Entre em contato diretamente para agendar.`;
    }
    return <UnavailableBookingPage message={message} />;
  }

  const selectedProfessional =
    context.professionals.find((p) => p.id === selectedProfessionalId) ??
    context.professionals[0];

  const slots = selectedProfessional
    ? await getAvailableSlots({
        tenantSlug: tenant_slug,
        professionalId: selectedProfessional.id,
        date: selectedDate,
      })
    : [];

  const bookingPagePath = `/booking-pages/${tenant_slug}`;

  const selectedDateLabel = new Date(
    `${selectedDate}T00:00:00`,
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-xl">
        {/* Logo */}
        {context.tenant.logo_url ? (
          <div className="mb-8 flex justify-center">
            <Image
              src={context.tenant.logo_url}
              alt={`Logo da clínica ${context.tenant.name}`}
              width={150}
              height={60}
              className="max-h-[60px] w-[150px] object-contain"
            />
          </div>
        ) : null}

        {/* Header */}
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Autoagendamento PodoDesk
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {context.tenant.booking_page_title ??
              `Agende com ${context.tenant.name}`}
          </h1>
          {context.tenant.booking_page_description ? (
            <p className="mt-2 text-sm text-muted">
              {context.tenant.booking_page_description}
            </p>
          ) : null}
        </div>

        {/* Feedback */}
        {success ? (
          <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <RecaptchaForm
          serverAction={createPublicBookingAction}
          recaptchaAction="booking"
          className="surface-card divide-y divide-slate-100 overflow-hidden p-0"
        >
          <input type="hidden" name="tenant_slug" value={tenant_slug} />
          <input type="hidden" name="return_path" value={bookingPagePath} />
          <input
            type="hidden"
            name="professional_id"
            value={selectedProfessional?.id ?? ""}
          />

          {/* Step 1 — Profissional e data */}
          <section className="p-5 sm:p-6">
            <p className="mb-3 text-sm font-semibold text-secondary">
              1. Profissional e data
            </p>
            <BookingFilters
              key={`${selectedProfessional?.id ?? ""}-${selectedDate}`}
              professionals={context.professionals}
              selectedProfessionalId={selectedProfessional?.id ?? ""}
              selectedDate={selectedDate}
              basePath={bookingPagePath}
            />
          </section>

          {/* Step 2 — Horário */}
          <section className="p-5 sm:p-6">
            <p className="mb-1 text-sm font-semibold text-secondary">
              2. Horário disponível
            </p>
            <p className="mb-4 text-xs capitalize text-muted">
              {selectedDateLabel}
            </p>
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {slots.map((slot) => (
                <label key={slot} className="block cursor-pointer">
                  <input
                    type="radio"
                    name="scheduled_at"
                    value={slot}
                    required
                    className="peer sr-only"
                  />
                  <span className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {new Date(slot).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </label>
              ))}
              {slots.length === 0 ? (
                <p className="col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted sm:col-span-4">
                  Não há horários livres para esta data.
                </p>
              ) : null}
            </div>
          </section>

          {/* Step 3 — Dados pessoais */}
          <section className="p-5 sm:p-6">
            <p className="mb-3 text-sm font-semibold text-secondary">
              3. Seus dados
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-foreground">
                  Nome completo
                </span>
                <input name="patient_name" required className="w-full" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">
                  Celular
                </span>
                <input
                  name="patient_phone"
                  required
                  type="tel"
                  className="w-full"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">
                  E-mail
                </span>
                <input
                  type="email"
                  name="patient_email"
                  required
                  className="w-full"
                />
              </label>
            </div>
          </section>

          {/* Submit */}
          <section className="p-5 sm:p-6">
            <RecaptchaSubmitButton
              label="Confirmar agendamento"
              pendingLabel="Aguardando confirmação..."
              disabled={!selectedProfessional || slots.length === 0}
            />
          </section>
        </RecaptchaForm>
      </div>
    </main>
  );
}
