import { redirect } from "next/navigation";
import {
  diagnosePublicProfessionalBooking,
  getPublicProfessionalBookingContext,
} from "@/lib/booking";

type Props = {
  params: Promise<{ professional_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function UnavailableBookingPage({ message }: { message: string }) {
  return (
    <main className="bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fafc,white)] px-6 py-12">
      <section className="surface-card mx-auto max-w-4xl border-warning/40 p-8">
        <h1 className="text-3xl font-bold text-secondary">Agendamento indisponível</h1>
        <p className="mt-3 text-muted">{message}</p>
      </section>
    </main>
  );
}

export default async function ProfessionalBookingPage({ params, searchParams }: Props) {
  const { professional_slug } = await params;
  const search = await searchParams;
  const selectedDate = typeof search.date === "string" ? search.date : null;

  let context;
  try {
    context = await getPublicProfessionalBookingContext(professional_slug);
  } catch {
    return <UnavailableBookingPage message="Página de agendamento indisponível" />;
  }

  if (!context) {
    const diagnostic = await diagnosePublicProfessionalBooking(professional_slug);
    let message = "Não foi possível localizar o profissional de agendamento para este link.";
    if (diagnostic.status === "professional_not_found") {
      message = "Nenhum profissional foi encontrado com este link.";
    } else if (diagnostic.status === "tenant_not_found") {
      message = "O profissional foi encontrado, mas a clínica vinculada não foi localizada.";
    } else if (diagnostic.status === "booking_disabled") {
      message = `O autoagendamento está desativado para a clínica ${diagnostic.tenantName}.`;
    } else if (diagnostic.status === "subscription_inactive") {
      message = `A assinatura da clínica ${diagnostic.tenantName} está vencida ou inativa.`;
    }
    return <UnavailableBookingPage message={message} />;
  }

  const qs = new URLSearchParams();
  qs.set("professional_id", context.professional.id);
  if (selectedDate) qs.set("date", selectedDate);
  redirect(`/booking-pages/${context.tenant.slug}?${qs.toString()}`);
}
