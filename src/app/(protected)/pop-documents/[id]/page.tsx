import { redirect } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function toDownloadFileName(title: string) {
  return `${
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pop-documento"
  }.txt`;
}

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
    .replaceAll("{{NOME_PROFISSIONAL}}", input.fullName)
    .replaceAll("{{REGISTRO_OU_CPF}}", input.registrationOrCpf)
    .replaceAll("{{REGISTRO}}", input.registrationOrCpf);
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PopDocumentDetailsPage({ params }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

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
    clinicName: tenant.name,
    fullName: appUser.full_name,
    registrationOrCpf:
      appUser.professional_register ?? tenant.cpf_cnpj ?? "Não informado",
  });

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
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(renderedContent)}`}
            download={toDownloadFileName(document.title)}
            className="rounded-md border border-secondary px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5"
          >
            Baixar POP
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="surface-card p-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">
          {renderedContent}
        </pre>
      </article>
    </section>
  );
}
