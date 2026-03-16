import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { requireActiveTenant } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireActiveTenant();

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <aside className="w-full bg-[#0F766E] px-5 py-6 text-white md:sticky md:top-0 md:h-screen md:w-72 md:flex-shrink-0">
        <div className="rounded-2xl bg-white/95 p-3">
          <BrandLogo className="h-auto w-32" />
        </div>

        <nav className="mt-6 flex flex-col gap-2 text-sm">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Dashboard
          </Link>
          <Link
            href="/patients"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Pacientes
          </Link>
          <Link
            href="/agenda"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Agenda
          </Link>
          <Link
            href="/medical-records/new"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Prontuários
          </Link>
          <Link
            href="/settings"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Configurações
          </Link>
          <Link
            href="/pop-documents"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            POPs
          </Link>
        </nav>

        <form action={signOutAction} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
