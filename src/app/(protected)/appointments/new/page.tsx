import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewAppointmentPage({ searchParams }: Props) {
  await requireActiveTenant();
  const params = await searchParams;
  const patientId =
    typeof params.patient_id === "string" ? params.patient_id : "";

  return (
    <section className="max-w-2xl rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-secondary">Nova consulta</h2>
      <p className="mt-2 text-muted">
        Fluxo inicial preparado para o Epico 3. Paciente selecionado:{" "}
        {patientId || "nao informado"}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {patientId ? (
          <Link
            href={`/medical-records/new?patient_id=${patientId}`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Iniciar prontuario da consulta
          </Link>
        ) : null}
      </div>
      <Link
        href={patientId ? `/patients/${patientId}` : "/patients"}
        className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
      >
        Voltar
      </Link>
    </section>
  );
}
