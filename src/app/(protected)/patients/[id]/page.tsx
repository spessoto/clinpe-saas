import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePatientAction } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

function normalizePhoneForWhatsApp(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.length === 11 || digits.length === 10) {
    return `55${digits}`;
  }

  return digits;
}

export default async function PatientDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, phone, birth_date, health_alerts, referral_source")
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    notFound();
  }

  const [recordsResult, appointmentsResult] = await Promise.all([
    supabase
      .from("medical_records")
      .select("id, created_at")
      .eq("tenant_id", appUser.tenant_id)
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("appointments")
      .select("id, professional_id, scheduled_at, status")
      .eq("tenant_id", appUser.tenant_id)
      .eq("patient_id", patient.id)
      .order("scheduled_at", { ascending: false })
      .limit(6),
  ]);

  const records = recordsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];

  const professionalIds = Array.from(
    new Set(appointments.map((appointment) => appointment.professional_id)),
  );

  const { data: professionals } = professionalIds.length
    ? await supabase
        .from("users")
        .select("id, full_name")
        .eq("tenant_id", appUser.tenant_id)
        .in("id", professionalIds)
    : { data: [] as { id: string; full_name: string }[] };

  const professionalsMap = new Map(
    (professionals ?? []).map((professional) => [
      professional.id,
      professional.full_name,
    ]),
  );

  const lastAppointmentDate = (() => {
    const lastAppointment = appointments?.[0]?.scheduled_at
      ? new Date(appointments[0].scheduled_at)
      : null;
    const lastRecord = records?.[0]?.created_at
      ? new Date(records[0].created_at)
      : null;

    const lastDate =
      lastAppointment && lastRecord
        ? lastAppointment > lastRecord
          ? lastAppointment
          : lastRecord
        : lastAppointment || lastRecord;

    return lastDate
      ? lastDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
      : "--/--/--";
  })();
  const completedAppointments =
    appointments?.filter((appointment) => appointment.status === "completed")
      .length ?? 0;
  const scheduledAppointments =
    appointments?.filter((appointment) => appointment.status === "scheduled")
      .length ?? 0;

  const appointmentStatusLabel: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    canceled: "Cancelada",
  };

  const healthAlerts = Array.isArray(patient.health_alerts)
    ? patient.health_alerts
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
    : [];

  const whatsappPhone = normalizePhoneForWhatsApp(patient.phone);
  const whatsappMessage = encodeURIComponent(
    `Olá, ${patient.name}! Tudo bem? Aqui é da clínica. Gostaríamos de confirmar seu retorno.`,
  );
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
    : null;

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <article className="surface-card p-6">
        {healthAlerts.length > 0 ? (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Alertas de risco
            </p>
            <p className="mt-1 text-sm text-destructive">
              {healthAlerts.join(" • ")}
            </p>
          </div>
        ) : null}

        <h2 className="text-2xl font-bold">{patient.name}</h2>
        <p className="mt-2 text-sm text-muted">Telefone: {patient.phone}</p>
        <p className="text-sm text-muted">
          Nascimento:{" "}
          {patient.birth_date
            ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
            : "Não informado"}
        </p>
        {patient.referral_source ? (
          <p className="text-sm text-muted">
            Origem do paciente: {patient.referral_source}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/medical-records/new?patient_id=${patient.id}`}
            className="btn-gradient h-10 px-5"
          >
            Nova consulta
          </Link>
          <Link
            href={`/patients/${patient.id}/edit`}
            className="btn-outline-modern h-10 px-5"
          >
            Editar
          </Link>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              WhatsApp
            </a>
          ) : null}
          <form action={deletePatientAction} className="inline-flex">
            <input type="hidden" name="id" value={patient.id} />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-destructive px-5 text-sm font-semibold text-white transition hover:bg-destructive/90"
            >
              Excluir
            </button>
          </form>
        </div>

        <section className="mt-6">
          <h3 className="text-lg font-semibold text-secondary">
            Histórico de prontuários
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {records.map((record) => (
              <li key={record.id} className="rounded-md bg-slate-50 px-3 py-2">
                <Link
                  href={`/medical-records/${record.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  Registro em{" "}
                  {new Date(record.created_at).toLocaleString("pt-BR")}
                </Link>
              </li>
            ))}
            {records.length === 0 ? (
              <li>Nenhum prontuário cadastrado.</li>
            ) : null}
          </ul>
        </section>
      </article>

      <div className="space-y-6">
        <aside className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Resumo de consultas
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-muted">Última consulta</p>
              <p className="mt-1 text-sm font-bold leading-tight text-foreground">
                {lastAppointmentDate}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-xs text-muted">Concluidas</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                {completedAppointments}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <p className="text-xs text-muted">Agendadas</p>
              <p className="mt-1 text-lg font-bold text-sky-700">
                {scheduledAppointments}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-muted">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="rounded-xl bg-slate-50 px-3 py-2"
              >
                <p className="font-semibold text-foreground">
                  {new Date(appointment.scheduled_at).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs">
                  {appointmentStatusLabel[appointment.status] ??
                    appointment.status}
                  {" - "}
                  {professionalsMap.get(appointment.professional_id) ??
                    "Profissional não informado"}
                </p>
              </li>
            ))}
            {appointments.length === 0 ? (
              <li>Nenhuma consulta encontrada.</li>
            ) : null}
          </ul>
        </aside>
      </div>
    </section>
  );
}
