import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePatientAction } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, phone, birth_date")
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    notFound();
  }

  const { data: records } = await supabase
    .from("medical_records")
    .select("id, created_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-secondary">{patient.name}</h2>
        <p className="mt-2 text-sm text-muted">Telefone: {patient.phone}</p>
        <p className="text-sm text-muted">
          Nascimento:{" "}
          {patient.birth_date
            ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
            : "Nao informado"}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/appointments/new?patient_id=${patient.id}`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Nova consulta
          </Link>
          <Link
            href={`/medical-records/new?patient_id=${patient.id}`}
            className="rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/10"
          >
            Novo prontuario
          </Link>
          <Link
            href={`/patients/${patient.id}/edit`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Editar
          </Link>
          <form action={deletePatientAction}>
            <input type="hidden" name="id" value={patient.id} />
            <button
              type="submit"
              className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Excluir
            </button>
          </form>
        </div>
      </article>

      <aside className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-secondary">
          Historico de prontuarios
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {(records ?? []).map((record) => (
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
          {records && records.length === 0 ? (
            <li>Nenhum prontuario cadastrado.</li>
          ) : null}
        </ul>
      </aside>
    </section>
  );
}
