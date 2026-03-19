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

  const [patientsResult, lotsResult, rejectedTestsResult, patientHealthResult] =
    await Promise.all([
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
      patientId
        ? supabase
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .eq("tenant_id", appUser.tenant_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const patients = patientsResult.data ?? [];
  const patientHealth = patientHealthResult.data;
  const selectedPatient = patientId
    ? (patients.find((patient) => patient.id === patientId) ??
      (patientHealth ? { id: patientId, name: patientHealth.name } : null))
    : null;
  const isPatientLocked = Boolean(patientId && selectedPatient?.name);
  const rejectedLotIdSet = new Set(
    (rejectedTestsResult.data ?? []).map((test) => test.sterilization_log_id),
  );

  const validLots = (lotsResult.data ?? []).filter(
    (lot) => !rejectedLotIdSet.has(lot.id),
  );

  return (
    <section className="surface-card mx-auto max-w-5xl p-6 md:p-8">
      <h2 className="text-2xl font-bold">Novo prontuário</h2>
      <p className="mt-1 text-sm text-muted">
        Registre anamnese estruturada e envie imagens clínicas.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createMedicalRecordAction} className="mt-6 space-y-8 pb-24">
        {/* ── Identificação da consulta ─────────────────────────── */}
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-foreground">Paciente *</span>
            {isPatientLocked ? (
              <>
                <input type="hidden" name="patient_id" value={patientId} />
                <input
                  value={selectedPatient?.name ?? ""}
                  readOnly
                  aria-readonly="true"
                  className="w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-foreground outline-none"
                />
              </>
            ) : (
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
            )}
          </label>

          <input type="hidden" name="appointment_id" value={appointmentId} />

          <label className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="is_return_visit"
              value="true"
              className="h-4 w-4"
            />
            <span>Consulta de retorno</span>
          </label>
        </div>

        {/* ── A. TRIAGEM SISTÊMICA ──────────────────────────────── */}
        <fieldset className="space-y-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-destructive">
            A — Triagem Sistêmica (Alertas de Risco)
          </legend>

          {patientHealth ? (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
              ℹ️ Seções A e B pré-preenchidas com dados do cadastro do paciente.
              Reconfirme com o paciente e ajuste se necessário.
            </div>
          ) : null}

          {/* Condições de risco — toggles single */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Condições sistêmicas
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  [
                    "has_diabetes",
                    "Diabetes",
                    patientHealth?.has_diabetes ?? false,
                  ],
                  [
                    "has_vascular_issues",
                    "Vascular / Cardíaco",
                    patientHealth?.has_vascular_issues ?? false,
                  ],
                  [
                    "has_coagulation_disorders",
                    "Distúrbio de Coagulação",
                    patientHealth?.has_coagulation_disorders ?? false,
                  ],
                  [
                    "has_oncological_history",
                    "Histórico Oncológico",
                    patientHealth?.has_oncological_history ?? false,
                  ],
                ] as [string, string, boolean][]
              ).map(([name, label, checked]) => (
                <label key={name} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={name}
                    value="true"
                    defaultChecked={checked}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-destructive/40 bg-white px-4 text-sm font-medium text-destructive/80 transition peer-checked:border-destructive peer-checked:bg-destructive peer-checked:text-white">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Diabetes — sub-campos */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-muted">
              Se Diabetes — detalhe:
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Tipo</span>
                <select
                  name="diabetes_type"
                  defaultValue={patientHealth?.diabetes_type ?? ""}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">—</option>
                  <option value="1">Tipo 1</option>
                  <option value="2">Tipo 2</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Usa insulina?</span>
                <select
                  name="diabetes_on_insulin"
                  defaultValue={
                    patientHealth?.diabetes_on_insulin === true
                      ? "true"
                      : patientHealth?.diabetes_on_insulin === false
                        ? "false"
                        : ""
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">—</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">
                  Última glicemia (valor)
                </span>
                <input
                  name="diabetes_last_glucose"
                  placeholder="Ex: 120 mg/dL"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          {/* Medicamentos contínuos — multi-toggle */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Medicamentos de uso contínuo
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "AAS / Anticoagulante",
                  "Imunossupressor",
                  "Corticoide",
                  "Outro (ver obs.)",
                ] as string[]
              ).map((med) => (
                <label key={med} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="continuous_meds"
                    value={med}
                    defaultChecked={(
                      patientHealth?.continuous_meds ?? []
                    ).includes(med)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-amber-400/60 bg-white px-4 text-sm font-medium text-amber-700 transition peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-checked:text-white">
                    {med}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Alergias — multi-toggle */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Alergias conhecidas
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "Iodo",
                  "Látex (luvas)",
                  "Anestésico tópico",
                  "Cosméticos",
                  "Outra (ver obs.)",
                ] as string[]
              ).map((allergy) => (
                <label key={allergy} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="allergies"
                    value={allergy}
                    defaultChecked={(
                      patientHealth?.patient_allergies ?? []
                    ).includes(allergy)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-orange-400/60 bg-white px-4 text-sm font-medium text-orange-700 transition peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white">
                    {allergy}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {/* ── B. HÁBITOS E ESTILO DE VIDA ──────────────────────── */}
        <fieldset className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-foreground">
            B — Hábitos e Estilo de Vida
          </legend>

          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="checkbox"
                name="is_smoker"
                value="true"
                defaultChecked={patientHealth?.is_smoker ?? false}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-slate-700 peer-checked:bg-slate-700 peer-checked:text-white">
                🚬 Fumante
              </span>
            </label>

            <label className="cursor-pointer">
              <input
                type="checkbox"
                name="has_sport_activity"
                value="true"
                className="peer sr-only"
              />
              <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                🏃 Pratica esporte
              </span>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">
              Esporte e frequência (se pratica)
            </span>
            <input
              name="sport_type"
              placeholder="Ex: Corrida 3x/semana, Natação diária..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Calçado predominante
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "Salto alto",
                  "Bico fino",
                  "Sapatilha",
                  "Bota EPI",
                  "Tênis",
                  "Chinelo",
                  "Outro",
                ] as string[]
              ).map((shoe) => (
                <label key={shoe} className="cursor-pointer">
                  <input
                    type="radio"
                    name="predominant_footwear"
                    value={shoe}
                    defaultChecked={
                      patientHealth?.predominant_footwear === shoe
                    }
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {shoe}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {/* ── C. EXAME FÍSICO PODOLÓGICO ────────────────────────── */}
        <fieldset className="space-y-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-primary">
            C — Exame Físico do Dia
          </legend>

          {/* Sinais vitais */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                Pressão Arterial (mmHg)
              </span>
              <input
                name="blood_pressure"
                placeholder="Ex: 120/80"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                Glicemia Capilar (mg/dL)
              </span>
              <input
                name="capillary_glucose"
                placeholder="Ex: 95"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          {/* Queixa */}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-foreground">
              Queixa principal *
            </span>
            <textarea
              name="chief_complaint"
              required
              rows={2}
              placeholder="Ex: Dor no hálux direito há 3 dias"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          {/* Avaliação Dermatológica */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">
              Avaliação Dermatológica (Pele)
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["skin_anhydrosis", "Anidrose / Fissuras"],
                  ["skin_hyperhidrosis", "Hiperidrose / Bromidrose"],
                  ["skin_tinea_pedis", "Tinea Pedis (frieira)"],
                  ["skin_plantar_wart", "Verruga Plantar"],
                  ["skin_hyperkeratosis", "Hiperqueratose / Calosidade"],
                ] as [string, string][]
              ).map(([name, label]) => (
                <label key={name} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={name}
                    value="true"
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-muted">
                Localização da hiperqueratose (se presente)
              </span>
              <input
                name="hyperkeratosis_location"
                placeholder="Ex: Plantar lateral D, interdigital D2-D3"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          {/* Avaliação Ortopédica */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">
              Avaliação Ortopédica Visível
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["orth_hallux_valgus", "Hálux Valgo (joanete)"],
                  ["orth_claw_toes", "Dedos em Garra / Martelo"],
                  ["orth_flat_foot", "Pé Plano (chato)"],
                  ["orth_cavus_foot", "Pé Cavo"],
                ] as [string, string][]
              ).map(([name, label]) => (
                <label key={name} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={name}
                    value="true"
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Avaliação das Unhas */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">
              Avaliação das Unhas (Lâmina Ungueal)
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["nail_onychocryptosis", "Onicocriptose (encravada)"],
                  ["nail_onychomycosis", "Onicomicose (micose)"],
                  ["nail_onycholysis", "Onicólise (descolamento)"],
                  ["nail_onychogryphosis", "Onicogrifose (espessada)"],
                ] as [string, string][]
              ).map(([name, label]) => (
                <label key={name} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={name}
                    value="true"
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">
                  Onicocriptose — dedo afetado
                </span>
                <input
                  name="onychocryptosis_toe"
                  placeholder="Ex: Hálux D, 2º dedo E"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">
                  Granuloma / infecção?
                </span>
                <select
                  name="onychocryptosis_granuloma"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none"
                >
                  <option value="">—</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </label>
            </div>
          </div>
        </fieldset>

        {/* ── DESFECHO DA CONSULTA ──────────────────────────────── */}
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <legend className="text-base font-semibold text-foreground">
            Desfecho da Consulta
          </legend>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Avaliação clínica geral / observações *
            </span>
            <textarea
              name="clinical_assessment"
              required
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Evolução / observações adicionais
            </span>
            <textarea
              name="evolution_notes"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>
        </fieldset>

        {/* ── REGISTRO FOTOGRÁFICO ─────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <h3 className="text-base font-semibold text-foreground">
              Imagens do procedimento
            </h3>
            <p className="mt-1 text-sm text-muted">
              Envie fotos para comparação clínica e documentação de evolução.
            </p>
            <input
              type="file"
              name="photos"
              multiple
              accept="image/*"
              className="mt-3 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-sm"
            />
          </article>

          {/* ── RASTREABILIDADE ───────────────────────────────────── */}
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
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
              <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
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
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={patientId ? `/patients/${patientId}` : "/patients"}
              className="btn-outline-modern"
            >
              Cancelar
            </Link>
            <button type="submit" className="btn-gradient">
              Salvar prontuário
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
