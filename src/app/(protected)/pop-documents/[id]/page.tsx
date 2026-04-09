import { redirect } from "next/navigation";

import { PopDownloadPdfButton } from "@/components/pop-download-pdf-button";
import { PrintButton } from "@/components/print-button";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function injectProfessionalData(
  content: string,
  input: {
    clinicName: string;
    fullName: string;
    registrationOrCpf: string;
  },
) {
  return content
    .replaceAll("{{ESTABELECIMENTO}}", input.clinicName)
    .replaceAll("[Nome da clínica]", input.clinicName)
    .replaceAll("{{NOME_PROFISSIONAL}}", input.fullName)
    .replaceAll("[Nome do Profissional e Registro]", input.fullName)
    .replaceAll("{{REGISTRO_OU_CPF}}", input.registrationOrCpf)
    .replaceAll("[CPF ou CNPJ para faturamento]", input.registrationOrCpf)
    .replaceAll("{{REGISTRO}}", input.registrationOrCpf);
}

function getLineClassName(line: string) {
  const trimmed = line.trim();

  if (!trimmed) {
    return "h-4";
  }

  if (/^MANUAL\sDE\sBOAS\sPR[ÁA]TICAS/i.test(trimmed)) {
    return "mt-2 text-lg font-bold text-secondary";
  }

  if (/^POP\s\d+:/i.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
    return "mt-5 text-base font-bold text-foreground";
  }

  if (/^[A-ZÀ-Ú0-9\s\-()]+:$/.test(trimmed)) {
    return "mt-4 text-sm font-semibold text-foreground";
  }

  return "text-sm leading-7 text-foreground";
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PopDocumentDetailsPage({ params }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const { data: tenantBranding } = await supabase
    .from("tenants")
    .select("name, cpf_cnpj, logo_url")
    .eq("id", tenant.id)
    .maybeSingle();

  const { data: document } = await supabase
    .from("pop_documents")
    .select("id, title, content, is_template, updated_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("id", id)
    .single();

  if (!document) {
    redirect(
      `/pop-documents?error=${encodeURIComponent("Documento POP não encontrado para este usuário.")}`,
    );
  }

  const renderedContent = injectProfessionalData(document.content, {
    clinicName: tenantBranding?.name ?? tenant.name,
    fullName: appUser.full_name,
    registrationOrCpf:
      appUser.professional_register ??
      tenantBranding?.cpf_cnpj ??
      tenant.cpf_cnpj ??
      "Não informado",
  });

  const renderedLines = renderedContent.split("\n");

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${document.is_template ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
          >
            {document.is_template ? "Template base" : "Documento"}
          </span>
          <h2 className="mt-3 text-3xl font-bold text-secondary">
            {document.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Atualizado em{" "}
            {new Date(document.updated_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <PopDownloadPdfButton
            title={document.title}
            content={renderedContent}
            updatedAt={new Date(document.updated_at).toLocaleString("pt-BR")}
            clinicLogoUrl={tenantBranding?.logo_url ?? tenant.logo_url ?? null}
          />
          <PrintButton />
        </div>
      </div>

      <article className="surface-card p-8">
        <div className="font-sans">
          {renderedLines.map((line, index) => (
            <p key={`${index}-${line}`} className={getLineClassName(line)}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}
