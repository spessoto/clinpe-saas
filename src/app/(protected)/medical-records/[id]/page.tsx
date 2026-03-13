import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

type AnamnesisData = {
  chief_complaint?: string;
  clinical_assessment?: string;
  procedure_performed?: string;
  recommendations?: string;
  evolution_notes?: string;
};

export default async function MedicalRecordDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const { data: record } = await supabase
    .from("medical_records")
    .select("id, patient_id, created_at, anamnesis_data, photos")
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!record) {
    notFound();
  }

  const anamnesis = (record.anamnesis_data ?? {}) as AnamnesisData;
  const photos = Array.isArray(record.photos) ? record.photos : [];

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <h2 className="text-2xl font-bold">Prontuario</h2>
        <p className="mt-1 text-sm text-muted">
          Criado em {new Date(record.created_at).toLocaleString("pt-BR")}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold text-foreground">Queixa principal</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {anamnesis.chief_complaint || "-"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold text-foreground">Avaliacao clinica</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {anamnesis.clinical_assessment || "-"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold text-foreground">Procedimento</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {anamnesis.procedure_performed || "-"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold text-foreground">Recomendacoes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {anamnesis.recommendations || "-"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
            <h3 className="font-semibold text-foreground">Evolucao</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {anamnesis.evolution_notes || "-"}
            </p>
          </div>
        </div>
      </article>

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">Imagens</h3>
        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhuma imagem anexada.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((url) => (
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
                    alt="Foto clinica"
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

      <Link
        href={`/patients/${record.patient_id}`}
        className="btn-outline-modern"
      >
        Voltar para paciente
      </Link>
    </section>
  );
}
