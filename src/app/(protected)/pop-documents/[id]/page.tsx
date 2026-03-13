import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function injectProfessionalData(
  content: string,
  input: { fullName: string; professionalRegister: string | null },
) {
  return content
    .replaceAll("{{NOME_PROFISSIONAL}}", input.fullName)
    .replaceAll("{{REGISTRO}}", input.professionalRegister || "Nao informado");
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PopDocumentDetailsPage({ params }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;

  const { data: document } = await supabase
    .from("pop_documents")
    .select("id, title, content, is_template, updated_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const renderedContent = injectProfessionalData(document.content, {
    fullName: appUser.full_name,
    professionalRegister: appUser.professional_register,
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
        <PrintButton />
      </div>

      <article className="surface-card p-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">
          {renderedContent}
        </pre>
      </article>
    </section>
  );
}
