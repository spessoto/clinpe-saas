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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const [patientsResult, lotsResult, rejectedTestsResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name")
      .eq("tenant_id", appUser.tenant_id)
      .order("name", { ascending: true }),
    supabase
      .from("sterilization_logs")
      .select(
        "id, batch_number, material_name, sterilized_at, chemical_indicator_status",
      )
      .eq("tenant_id", appUser.tenant_id)
      .eq("chemical_indicator_status", "approved")
      .gte("sterilized_at", cutoff.toISOString())
      .order("sterilized_at", { ascending: false }),
    supabase
      .from("sterilization_biological_tests")
      .select("sterilization_log_id")
      .eq("tenant_id", appUser.tenant_id)
      .eq("status", "rejected"),
  ]);

  const patients = patientsResult.data ?? [];
  const rejectedLotIdSet = new Set(
    (rejectedTestsResult.data ?? []).map((test) => test.sterilization_log_id),
  );

  const validLots = (lotsResult.data ?? []).filter(
    (lot) => !rejectedLotIdSet.has(lot.id),
  );

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
            {patients.map((patient) => (
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

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-foreground">
            Rastreabilidade de materiais
          </h3>
          <p className="mt-1 text-sm text-muted">
            Adicione os lotes utilizados (somente lotes válidos dos últimos 30
            dias).
          </p>

          {validLots.length === 0 ? (
            <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              Nenhum lote válido disponível. Registre os ciclos na Central de
              Esterilização.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {validLots.map((lot) => (
                <label
                  key={lot.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="sterilization_lot_ids"
                    value={lot.id}
                  />
                  <span className="font-semibold text-foreground">
                    {lot.batch_number}
                  </span>
                  <span className="text-muted">• {lot.material_name}</span>
                  <span className="text-muted">
                    • {new Date(lot.sterilized_at).toLocaleString("pt-BR")}
                  </span>
                </label>
              ))}
            </div>
          )}
        </article>

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
