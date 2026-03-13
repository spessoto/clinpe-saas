import { createPublicBookingAction } from "@/app/public-booking-actions";
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
      <section className="mx-auto max-w-4xl rounded-3xl border border-warning/40 bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-secondary">
          Agendamento indisponivel
        </h1>
        <p className="mt-3 text-muted">{message}</p>
        <p className="mt-4 text-sm text-muted">
          Assim que a configuracao for concluida, esta pagina exibira os dados
          do profissional, da clinica e os horarios de atendimento do formulario
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
        : "Pagina de agendamento indisponivel";

    return <UnavailableBookingPage message={message} />;
  }

  if (!context) {
    const diagnostic =
      await diagnosePublicProfessionalBooking(professional_slug);
    let message =
      "Nao foi possivel localizar o profissional de agendamento para este link.";

    if (diagnostic.status === "professional_not_found") {
      message =
        "Nenhum profissional foi encontrado com este link. Verifique se o booking_slug do usuario esta preenchido no Supabase.";
    }

    if (diagnostic.status === "tenant_not_found") {
      message =
        "O profissional foi encontrado, mas a clinica vinculada nao foi localizada no banco.";
    }

    if (diagnostic.status === "booking_disabled") {
      message = `O autoagendamento esta desativado para a clinica ${diagnostic.tenantName}. Ative booking_enabled na tabela tenants.`;
    }

    return <UnavailableBookingPage message={message} />;
  }

  const initials = getProfessionalInitials(context.professional.full_name);

  const slots = await getAvailableSlots({
    tenantSlug: context.tenant.slug,
    professionalId: context.professional.id,
    date: selectedDate,
  });

  return (
    <main className="bg-[radial-gradient(circle_at_top,#ccfbf1,transparent_35%),linear-gradient(180deg,#f8fafc,white)] px-6 py-12">
      <section className="mx-auto max-w-6xl">
        <article className="rounded-3xl border border-slate-200 bg-card p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-bold text-white">
                {initials}
              </div>
              <div>
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Agenda online PodoClin
                </span>
                <h1 className="mt-3 text-3xl font-bold text-secondary md:text-4xl">
                  {context.professional.full_name}
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Registro profissional:{" "}
                  {context.professional.professional_register ??
                    "Nao informado"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Clinica: {context.tenant.name}
                </p>
              </div>
            </div>

            <form
              action={`/${professional_slug}`}
              method="get"
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">
                  Data da consulta
                </span>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
              <button
                type="submit"
                className="mt-3 w-full rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/10"
              >
                Atualizar horarios
              </button>
            </form>
          </div>

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
        </article>

        <section className="mt-8">
          <article className="rounded-3xl border border-slate-200 bg-card p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-secondary">
              Solicitar agendamento
            </h2>
            <p className="mt-2 text-sm text-muted">
              Preencha seus dados e selecione um horario disponivel para
              concluir o agendamento. A consulta sera registrada no sistema e
              sincronizada com a agenda do profissional.
            </p>

            <form action={createPublicBookingAction} className="mt-6 space-y-4">
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
                <span className="mb-1 block text-foreground">E-mail</span>
                <input
                  type="email"
                  name="patient_email"
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

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-foreground">
                  Horarios disponiveis
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
                disabled={slots.length === 0}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar agendamento
              </button>
            </form>
          </article>
        </section>
      </section>
    </main>
  );
}
