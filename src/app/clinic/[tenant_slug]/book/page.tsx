import { notFound } from "next/navigation";

import { createPublicBookingAction } from "@/app/public-booking-actions";
import { getAvailableSlots, getPublicBookingContext } from "@/lib/booking";

type Props = {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublicBookingPage({
  params,
  searchParams,
}: Props) {
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
        : "Booking publico nao configurado";
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <section className="w-full rounded-3xl border border-warning/30 bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-secondary">
            Autoagendamento indisponivel
          </h1>
          <p className="mt-3 text-muted">{message}</p>
        </section>
      </main>
    );
  }

  if (!context || !context.tenant.booking_enabled) {
    notFound();
  }

  const selectedProfessional =
    context.professionals.find(
      (professional) => professional.id === selectedProfessionalId,
    ) ?? context.professionals[0];

  const slots = selectedProfessional
    ? await getAvailableSlots({
        tenantSlug: tenant_slug,
        professionalId: selectedProfessional.id,
        date: selectedDate,
      })
    : [];

  return (
    <main className="bg-[radial-gradient(circle_at_top,#ccfbf1,transparent_35%),linear-gradient(180deg,#f8fafc,white)] px-6 py-12">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-card p-8 shadow-sm">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Autoagendamento PodoClin
          </span>
          <h1 className="mt-4 text-4xl font-bold text-secondary">
            {context.tenant.booking_page_title ??
              `Agende com ${context.tenant.name}`}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            {context.tenant.booking_page_description ??
              "Selecione um profissional e escolha um horario livre."}
          </p>

          {success ? (
            <p className="mt-6 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
              {success}
            </p>
          ) : null}
          {error ? (
            <p className="mt-6 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            action={`/clinic/${tenant_slug}/book`}
            method="get"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Profissional</span>
              <select
                name="professional_id"
                defaultValue={selectedProfessional?.id ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              >
                {context.professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Data</span>
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/10 md:col-span-2"
            >
              Atualizar horarios
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-secondary">
            Horarios disponiveis
          </h2>
          <p className="mt-2 text-sm text-muted">
            Escolha um horario e preencha seus dados para confirmar a consulta.
          </p>

          <form action={createPublicBookingAction} className="mt-6 space-y-4">
            <input type="hidden" name="tenant_slug" value={tenant_slug} />
            <input
              type="hidden"
              name="return_path"
              value={`/clinic/${tenant_slug}/book`}
            />
            <input
              type="hidden"
              name="professional_id"
              value={selectedProfessional?.id ?? ""}
            />

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Nome completo</span>
              <input
                name="patient_name"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Telefone</span>
              <input
                name="patient_phone"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">E-mail</span>
              <input
                type="email"
                name="patient_email"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-foreground">
                Horario
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {slots.map((slot) => (
                  <label
                    key={slot}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="scheduled_at"
                      value={slot}
                      required
                    />
                    <span>
                      {new Date(slot).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </label>
                ))}
                {slots.length === 0 ? (
                  <p className="text-sm text-muted">
                    Nao ha horarios livres para esta data.
                  </p>
                ) : null}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!selectedProfessional || slots.length === 0}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar agendamento
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
