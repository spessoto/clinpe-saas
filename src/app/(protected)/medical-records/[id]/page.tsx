import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

type AnamnesisData = {
  // A
  has_diabetes?: boolean;
  diabetes_type?: string | null;
  diabetes_on_insulin?: boolean | null;
  diabetes_last_glucose?: string | null;
  has_vascular_issues?: boolean;
  has_coagulation_disorders?: boolean;
  has_oncological_history?: boolean;
  continuous_meds?: string[];
  allergies?: string[];
  // B
  is_smoker?: boolean;
  has_sport_activity?: boolean;
  sport_type?: string | null;
  predominant_footwear?: string | null;
  // C
  blood_pressure?: string | null;
  capillary_glucose?: string | null;
  chief_complaint?: string;
  skin_anhydrosis?: boolean;
  skin_hyperhidrosis?: boolean;
  skin_tinea_pedis?: boolean;
  skin_plantar_wart?: boolean;
  skin_hyperkeratosis?: boolean;
  hyperkeratosis_location?: string | null;
  orth_hallux_valgus?: boolean;
  orth_claw_toes?: boolean;
  orth_flat_foot?: boolean;
  orth_cavus_foot?: boolean;
  nail_onychocryptosis?: boolean;
  onychocryptosis_toe?: string | null;
  onychocryptosis_granuloma?: boolean | null;
  nail_onychomycosis?: boolean;
  nail_onycholysis?: boolean;
  nail_onychogryphosis?: boolean;
  // Desfecho
  clinical_assessment?: string;
  procedure_performed?: string;
  recommendations?: string;
  evolution_notes?: string;
  sterilization_materials_used?: Array<{
    lot_id?: string;
    batch_number?: string;
    material?: string;
  }>;
};

export default async function MedicalRecordDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const [recordResult, lotLinksResult] = await Promise.all([
    supabase
      .from("medical_records")
      .select("id, patient_id, created_at, anamnesis_data, photos")
      .eq("id", id)
      .eq("tenant_id", appUser.tenant_id)
      .single(),
    supabase
      .from("medical_record_sterilization_lots")
      .select(
        "id, sterilization_log_id, lot:sterilization_logs(batch_number, material_name, sterilized_at)",
      )
      .eq("tenant_id", appUser.tenant_id)
      .eq("medical_record_id", id),
  ]);

  const record = recordResult.data;
  const lotLinks =
    (lotLinksResult.data as Array<{
      id: string;
      sterilization_log_id: string;
      lot:
        | {
            batch_number: string;
            material_name: string;
            sterilized_at: string;
          }
        | {
            batch_number: string;
            material_name: string;
            sterilized_at: string;
          }[]
        | null;
    }> | null) ?? [];

  if (!record) {
    redirect(
      `/patients?error=${encodeURIComponent("Prontuário não encontrado para este usuário.")}`,
    );
  }

  const anamnesis = (record.anamnesis_data ?? {}) as AnamnesisData;
  const photos = Array.isArray(record.photos) ? record.photos : [];
  const resolvedPhotos = await Promise.all(
    photos.map(async (value) => {
      const storedValue = String(value ?? "").trim();

      if (!storedValue) {
        return null;
      }

      if (/^https?:\/\//i.test(storedValue)) {
        return storedValue;
      }

      const { data, error } = await supabase.storage
        .from("medical-record-images")
        .createSignedUrl(storedValue, 60 * 60 * 24);

      if (error || !data?.signedUrl) {
        return null;
      }

      return data.signedUrl;
    }),
  );
  const displayPhotos = resolvedPhotos.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const selectedTraceabilityMaterials = Array.isArray(
    anamnesis.sterilization_materials_used,
  )
    ? anamnesis.sterilization_materials_used
        .map((item) => ({
          lotId: String(item.lot_id ?? "").trim(),
          batchNumber: String(item.batch_number ?? "").trim(),
          material: String(item.material ?? "").trim(),
        }))
        .filter((item) => item.batchNumber && item.material)
    : [];

  const lotLinkByLotId = new Map(
    lotLinks.map((link) => [link.sterilization_log_id, link]),
  );

  // Tags de risco para exibir em destaque
  const riskTags: string[] = [];
  if (anamnesis.has_diabetes)
    riskTags.push(
      "Diabetes" +
        (anamnesis.diabetes_type ? ` T${anamnesis.diabetes_type}` : ""),
    );
  if (anamnesis.has_vascular_issues) riskTags.push("Vascular/Cardíaco");
  if (anamnesis.has_coagulation_disorders)
    riskTags.push("Distúrbio Coagulação");
  if (anamnesis.has_oncological_history) riskTags.push("Histórico Oncológico");
  if (anamnesis.is_smoker) riskTags.push("Fumante");
  (anamnesis.continuous_meds ?? []).forEach((m) => riskTags.push(m));
  (anamnesis.allergies ?? []).forEach((a) => riskTags.push(`Alergia: ${a}`));

  // Achados clínicos do dia
  const skinFindings: string[] = [];
  if (anamnesis.skin_anhydrosis) skinFindings.push("Anidrose/Fissuras");
  if (anamnesis.skin_hyperhidrosis) skinFindings.push("Hiperidrose/Bromidrose");
  if (anamnesis.skin_tinea_pedis) skinFindings.push("Tinea Pedis");
  if (anamnesis.skin_plantar_wart) skinFindings.push("Verruga Plantar");
  if (anamnesis.skin_hyperkeratosis)
    skinFindings.push(
      "Hiperqueratose" +
        (anamnesis.hyperkeratosis_location
          ? ` (${anamnesis.hyperkeratosis_location})`
          : ""),
    );

  const orthFindings: string[] = [];
  if (anamnesis.orth_hallux_valgus) orthFindings.push("Hálux Valgo");
  if (anamnesis.orth_claw_toes) orthFindings.push("Dedos em Garra/Martelo");
  if (anamnesis.orth_flat_foot) orthFindings.push("Pé Plano");
  if (anamnesis.orth_cavus_foot) orthFindings.push("Pé Cavo");

  const nailFindings: string[] = [];
  if (anamnesis.nail_onychocryptosis) {
    let label = "Onicocriptose";
    if (anamnesis.onychocryptosis_toe)
      label += ` (${anamnesis.onychocryptosis_toe})`;
    if (anamnesis.onychocryptosis_granuloma) label += " + Granuloma";
    nailFindings.push(label);
  }
  if (anamnesis.nail_onychomycosis) nailFindings.push("Onicomicose");
  if (anamnesis.nail_onycholysis) nailFindings.push("Onicólise");
  if (anamnesis.nail_onychogryphosis) nailFindings.push("Onicogrifose");

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <h2 className="text-2xl font-bold">Prontuário</h2>
        <p className="mt-1 text-sm text-muted">
          Criado em {new Date(record.created_at).toLocaleString("pt-BR")}
        </p>

        {/* Tags de risco */}
        {riskTags.length > 0 ? (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-destructive">
              Alertas de Risco
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {riskTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-destructive px-2 py-1 text-xs font-semibold text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* A — Triagem Sistêmica */}
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-destructive/80">
            A — Triagem Sistêmica
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {anamnesis.has_diabetes ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-muted">Diabetes</p>
                <p className="mt-1 text-sm">
                  {anamnesis.diabetes_type
                    ? `Tipo ${anamnesis.diabetes_type}`
                    : "Tipo não informado"}
                  {anamnesis.diabetes_on_insulin === true
                    ? " • Usa insulina"
                    : anamnesis.diabetes_on_insulin === false
                      ? " • Não usa insulina"
                      : ""}
                  {anamnesis.diabetes_last_glucose
                    ? ` • Última glicemia: ${anamnesis.diabetes_last_glucose}`
                    : ""}
                </p>
              </div>
            ) : null}
            {(anamnesis.continuous_meds ?? []).length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700">
                  Medicamentos contínuos
                </p>
                <p className="mt-1 text-sm">
                  {(anamnesis.continuous_meds ?? []).join(" • ")}
                </p>
              </div>
            ) : null}
            {(anamnesis.allergies ?? []).length > 0 ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs font-semibold text-orange-700">
                  Alergias
                </p>
                <p className="mt-1 text-sm">
                  {(anamnesis.allergies ?? []).join(" • ")}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* B — Hábitos */}
        {anamnesis.is_smoker ||
        anamnesis.has_sport_activity ||
        anamnesis.predominant_footwear ? (
          <section className="mt-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/60">
              B — Hábitos e Estilo de Vida
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {anamnesis.is_smoker ? (
                <span className="rounded-lg bg-slate-700 px-3 py-1 text-white">
                  🚬 Fumante
                </span>
              ) : null}
              {anamnesis.has_sport_activity ? (
                <span className="rounded-lg bg-primary px-3 py-1 text-white">
                  🏃{" "}
                  {anamnesis.sport_type
                    ? anamnesis.sport_type
                    : "Pratica esporte"}
                </span>
              ) : null}
              {anamnesis.predominant_footwear ? (
                <span className="rounded-lg border border-slate-300 bg-white px-3 py-1">
                  👟 {anamnesis.predominant_footwear}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* C — Exame Físico */}
        <section className="mt-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary/80">
            C — Exame Físico do Dia
          </h3>

          {anamnesis.blood_pressure || anamnesis.capillary_glucose ? (
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {anamnesis.blood_pressure ? (
                <span>
                  PA:{" "}
                  <strong className="text-foreground">
                    {anamnesis.blood_pressure}
                  </strong>{" "}
                  mmHg
                </span>
              ) : null}
              {anamnesis.capillary_glucose ? (
                <span>
                  Glicemia capilar:{" "}
                  <strong className="text-foreground">
                    {anamnesis.capillary_glucose}
                  </strong>{" "}
                  mg/dL
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold text-foreground">
                Queixa principal
              </h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {anamnesis.chief_complaint || "-"}
              </p>
            </div>

            {skinFindings.length > 0 ? (
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="font-semibold text-foreground">
                  Achados — Pele
                </h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {skinFindings.map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {orthFindings.length > 0 ? (
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="font-semibold text-foreground">
                  Achados — Ortopédico
                </h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {orthFindings.map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {nailFindings.length > 0 ? (
              <div className="rounded-xl bg-slate-50 p-4">
                <h4 className="font-semibold text-foreground">
                  Achados — Unhas
                </h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {nailFindings.map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold text-foreground">
                Avaliação clínica
              </h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {anamnesis.clinical_assessment || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold text-foreground">Procedimento</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {anamnesis.procedure_performed || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold text-foreground">Recomendações</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {anamnesis.recommendations || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
              <h4 className="font-semibold text-foreground">Evolução</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {anamnesis.evolution_notes || "-"}
              </p>
            </div>
          </div>
        </section>
      </article>

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">Imagens</h3>
        {displayPhotos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhuma imagem anexada.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayPhotos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <div className="relative h-40 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <Image
                    src={url}
                    alt="Foto clínica"
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </article>

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">
          Rastreabilidade de materiais
        </h3>

        {lotLinks.length === 0 && selectedTraceabilityMaterials.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nenhum lote de esterilização vinculado a este prontuário.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedTraceabilityMaterials.length > 0
              ? selectedTraceabilityMaterials.map((item, index) => {
                  const linkedLot = lotLinkByLotId.get(item.lotId);

                  if (!linkedLot) {
                    return (
                      <div
                        key={`${item.batchNumber}-${item.material}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-sm text-muted">
                          Lote {item.batchNumber} | Material Utilizado:{" "}
                          {item.material}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={`${linkedLot.id}-${item.material}-${index}`}
                      href={`/sterilization/${linkedLot.sterilization_log_id}`}
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:border-primary/40"
                    >
                      <p className="text-sm text-muted">
                        Lote {item.batchNumber} | Material Utilizado:{" "}
                        {item.material}
                      </p>
                    </Link>
                  );
                })
              : lotLinks.map((link) => {
                  const lot = Array.isArray(link.lot) ? link.lot[0] : link.lot;

                  return (
                    <Link
                      key={link.id}
                      href={`/sterilization/${link.sterilization_log_id}`}
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:border-primary/40"
                    >
                      <p className="text-sm text-muted">
                        Lote {lot?.batch_number ?? "-"} | Material Utilizado:
                        não discriminado
                      </p>
                    </Link>
                  );
                })}
          </div>
        )}
      </article>

      <Link
        href={`/patients/${record.patient_id}`}
        className="btn-outline-modern"
      >
        Voltar para paciente
      </Link>
    </section>
  );
}
