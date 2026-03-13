import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { requireActiveTenant } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { appUser, tenant } = await requireActiveTenant();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">ClinPe</p>
            <h1 className="text-sm font-semibold text-secondary">
              {tenant.name}
            </h1>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-foreground hover:text-secondary"
            >
              Dashboard
            </Link>
            <Link
              href="/patients"
              className="text-foreground hover:text-secondary"
            >
              Pacientes
            </Link>
            <Link
              href="/medical-records/new"
              className="text-foreground hover:text-secondary"
            >
              Prontuarios
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-foreground hover:bg-slate-100"
              >
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <p className="mb-6 text-sm text-muted">
          Logado como {appUser.full_name}
        </p>
        {children}
      </main>
    </div>
  );
}
