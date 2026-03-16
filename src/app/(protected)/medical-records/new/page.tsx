import Link from "next/link";

import { createMedicalRecordAction } from "@/app/(protected)/medical-records/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewMedicalRecordPage({ searchParams }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const params = await searchParams;
  const patientId =
    typeof params.patient_id === "string" ? params.patient_id : "";
  const appointmentId =
    typeof params.appointment_id === "string" ? params.appointment_id : "";
  const error = typeof params.error === "string" ? params.error : null;

  const { data: patients } = await supabase
    .from("patients")
    .select("id, name")
    .eq("tenant_id", appUser.tenant_id)
    .order("name", { ascending: true });

  return (
    <section className="surface-card max-w-3xl p-6">
      <h2 className="text-2xl font-bold">Novo prontuário</h2>
      <p className="mt-1 text-sm text-muted">
        Registre anamnese estruturada e envie imagens clínicas.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createMedicalRecordAction} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Paciente *</span>
          <select
            name="patient_id"
            required
            defaultValue={patientId}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          >
            <option value="">Selecione...</option>
            {(patients ?? []).map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">
            ID da consulta (opcional)
          </span>
          <input
            name="appointment_id"
            defaultValue={appointmentId}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-foreground">
              Queixa principal *
            </span>
            <textarea
              name="chief_complaint"
              required
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-foreground">
              Avaliação clínica *
            </span>
            <textarea
              name="clinical_assessment"
              required
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Procedimento realizado
            </span>
            <textarea
              name="procedure_performed"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Recomendações</span>
            <textarea
              name="recommendations"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-foreground">
              Evolução/observações
            </span>
            <textarea
              name="evolution_notes"
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">
            Imagens do procedimento
          </span>
          <input
            type="file"
            name="photos"
            multiple
            accept="image/*"
            className="w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            As imagens serão enviadas para `medical-images/{appUser.tenant_id}
            /...`.
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-gradient">
            Salvar prontuário
          </button>
          <Link
            href={patientId ? `/patients/${patientId}` : "/patients"}
            className="btn-outline-modern"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
