import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PopDocumentsPage() {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("pop_documents")
    .select("id, title, is_template, updated_at")
    .eq("tenant_id", appUser.tenant_id)
    .order("is_template", { ascending: false })
    .order("title", { ascending: true });

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">POPs</h2>
          <p className="mt-1 text-muted">
            Templates base e documentos padrão com substituição automática.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(documents ?? []).map((document) => (
          <article key={document.id} className="surface-card p-5">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${document.is_template ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
            >
              {document.is_template ? "Template base" : "Documento"}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {document.title}
            </h3>
            <p className="mt-2 text-sm text-muted">
              Atualizado em{" "}
              {new Date(document.updated_at).toLocaleDateString("pt-BR")}
            </p>
            <Link
              href={`/pop-documents/${document.id}`}
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Visualizar
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
