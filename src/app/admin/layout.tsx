import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogoWhite } from "@/components/brand-logo";
import { requireAdminAccess } from "@/lib/auth";

export const revalidate = 1800;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const adminUser = await requireAdminAccess();

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="w-full bg-[#1E3A8A] px-5 py-6 text-white md:sticky md:top-0 md:h-screen md:w-80 md:flex-shrink-0">
        <BrandLogoWhite className="h-auto w-40" />

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">
            Painel administrativo
          </p>
          <p className="mt-2 text-sm font-semibold">{adminUser.full_name}</p>
          <p className="text-xs text-white/75">{adminUser.email}</p>
        </div>

        <nav className="mt-6 flex flex-col gap-2 text-sm">
          <Link
            href="/admin"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Visão geral
          </Link>
          <Link
            href="/admin/users"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Usuários
          </Link>
          <Link
            href="/admin/coupons"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Cupons
          </Link>
          <Link
            href="/admin/pricing"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Preços
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Configurações
          </Link>
        </nav>

        <form action={signOutAction} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-xl border border-white/35 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
