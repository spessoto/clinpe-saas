import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GoogleIntegrationPage({ searchParams }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const params = await searchParams;

  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { data: integration } = await supabase
    .from("google_integrations")
    .select("google_email, scope, updated_at")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .maybeSingle();

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${tenant.slug}/book`;

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-secondary">Google Calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Conecte sua agenda Google para sincronizar disponibilidade e novos
          agendamentos.
        </p>

        {success ? (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-muted">
          {integration ? (
            <>
              <p className="font-semibold text-foreground">
                Conta conectada:{" "}
                {integration.google_email ?? "Google conectado"}
              </p>
              <p className="mt-1">
                Ultima atualizacao:{" "}
                {new Date(integration.updated_at).toLocaleString("pt-BR")}
              </p>
            </>
          ) : (
            <p>Nenhuma conta Google conectada para este profissional.</p>
          )}
        </div>

        <Link
          href="/api/google/connect"
          className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {integration
            ? "Reconectar Google Calendar"
            : "Conectar Google Calendar"}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-secondary">
          Link publico de agendamento
        </h3>
        <p className="mt-2 text-sm text-muted">
          Compartilhe este link com seus pacientes para autoagendamento.
        </p>
        <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-foreground">
          {bookingUrl}
        </div>
      </article>
    </section>
  );
}
