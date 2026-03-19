import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type LastAppointmentInfo = {
  patientId: string;
  scheduledAt: string;
};

function getRecallCutoffDate() {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  return now;
}

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function PatientsRecallPage() {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const cutoffDate = getRecallCutoffDate();

  const [patientsResult, appointmentsResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, phone")
      .eq("tenant_id", appUser.tenant_id)
      .order("name", { ascending: true }),
    supabase
      .from("appointments")
      .select("patient_id, scheduled_at, status")
      .eq("tenant_id", appUser.tenant_id)
      .neq("status", "canceled")
      .order("scheduled_at", { ascending: false }),
  ]);

  const patients = patientsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];

  const lastAppointmentByPatient = new Map<string, LastAppointmentInfo>();

  for (const appointment of appointments) {
    if (!lastAppointmentByPatient.has(appointment.patient_id)) {
      lastAppointmentByPatient.set(appointment.patient_id, {
        patientId: appointment.patient_id,
        scheduledAt: appointment.scheduled_at,
      });
    }
  }

  const recallCandidates = patients
    .map((patient) => {
      const lastAppointment = lastAppointmentByPatient.get(patient.id);
      if (!lastAppointment) {
        return null;
      }

      const lastDate = new Date(lastAppointment.scheduledAt);
      if (lastDate > cutoffDate) {
        return null;
      }

      const phoneForWhatsApp = normalizePhoneForWhatsApp(patient.phone);
      const message = encodeURIComponent(
        `Olá, ${patient.name}! Tudo bem? Notamos que faz um tempo desde sua última consulta. Vamos agendar seu retorno?`,
      );

      return {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        lastAppointmentAt: lastAppointment.scheduledAt,
        whatsappUrl: phoneForWhatsApp
          ? `https://wa.me/${phoneForWhatsApp}?text=${message}`
          : null,
      };
    })
    .filter((patient): patient is NonNullable<typeof patient> =>
      Boolean(patient),
    )
    .sort(
      (a, b) =>
        new Date(a.lastAppointmentAt).getTime() -
        new Date(b.lastAppointmentAt).getTime(),
    );

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Pacientes para retorno</h2>
          <p className="mt-1 text-muted">
            Lista de pacientes com última consulta há mais de 30 dias.
          </p>
        </div>
        <Link href="/patients" className="btn-outline-modern">
          Voltar para pacientes
        </Link>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Última consulta</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {recallCandidates.map((patient) => (
              <tr key={patient.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-foreground">
                  {patient.name}
                </td>
                <td className="px-4 py-3 text-muted">{patient.phone}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDateTime(patient.lastAppointmentAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      Ver paciente
                    </Link>
                    {patient.whatsappUrl ? (
                      <a
                        href={patient.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}

            {recallCandidates.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  Nenhum paciente com retorno pendente no momento.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
