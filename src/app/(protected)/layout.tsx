import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { requireActiveTenant } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { appUser, tenant } = await requireActiveTenant();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-slate-200 bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-auto w-32" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                PodoClin
              </p>
              <h1 className="text-sm font-semibold text-secondary">
                {tenant.name}
              </h1>
            </div>
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
            <Link
              href="/integrations/google"
              className="text-foreground hover:text-secondary"
            >
              Google
            </Link>
            <Link
              href="/pop-documents"
              className="text-foreground hover:text-secondary"
            >
              POPs
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
