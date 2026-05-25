import Link from "next/link";
import { notFound } from "next/navigation";

import { acceptInviteAction } from "@/app/join/[token]/actions";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JoinPage({ params, searchParams }: Props) {
  const { token } = await params;
  const search = await searchParams;
  const errorParam = typeof search.error === "string" ? search.error : null;

  const adminClient = createAdminClient();

  const { data: invite } = await adminClient
    .from("user_invites")
    .select("id, email, full_name, used_at, expires_at, tenant_id")
    .eq("token", token)
    .maybeSingle();

  // Not found
  if (!invite) {
    notFound();
  }

  // Fetch clinic name
  const { data: tenantData } = await adminClient
    .from("tenants")
    .select("name")
    .eq("id", invite.tenant_id)
    .maybeSingle();

  const clinicName = tenantData?.name ?? "Clínica";

  // Already used
  if (invite.used_at) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <section className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-secondary">
            Convite já utilizado
          </h1>
          <p className="text-sm text-muted">
            Este convite já foi aceito. Se você já tem uma conta, faça login.
          </p>
          <Link
            href="/sign-in"
            className="inline-block rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Ir para o login
          </Link>
        </section>
      </main>
    );
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <section className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-secondary">
            Convite expirado
          </h1>
          <p className="text-sm text-muted">
            Este convite expirou. Peça ao proprietário da clínica para reenviar
            o convite.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ccfbf1,transparent_35%),linear-gradient(180deg,#f8fafc,white)] px-6 py-12">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Convite
          </span>
          <h1 className="mt-4 text-2xl font-bold text-secondary">
            Junte-se a {clinicName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Você foi convidado para fazer parte da equipe. Crie sua senha para
            acessar o sistema.
          </p>
        </div>

        {errorParam ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorParam}
          </p>
        ) : null}

        <form action={acceptInviteAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              E-mail
            </p>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-foreground">
              {invite.email}
            </p>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Nome completo <span className="text-destructive">*</span>
            </span>
            <input
              name="full_name"
              required
              defaultValue={invite.full_name ?? ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Registro profissional (opcional)
            </span>
            <input
              name="professional_register"
              placeholder="Ex.: CREFITO-3 / 12345-F"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Senha <span className="text-destructive">*</span>
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
            <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres.</p>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Confirmar senha <span className="text-destructive">*</span>
            </span>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <button type="submit" className="btn-gradient w-full py-2 text-sm">
            Criar conta e acessar
          </button>
        </form>
      </section>
    </main>
  );
}
