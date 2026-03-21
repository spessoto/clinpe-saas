import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogoWhite } from "@/components/brand-logo";
import { requireActiveTenant, type Tenant } from "@/lib/auth";
import { MobileSidebar } from "./mobile-sidebar";
import { RenewalBanner } from "./renewal-banner";

const RENEWAL_WARNING_DAYS = 5;

function computeRenewalBanner(tenant: Tenant) {
  if (
    tenant.subscription_status !== "active" ||
    !tenant.subscription_expires_at ||
    tenant.subscription_billing_method === "CREDIT_CARD"
  ) {
    return null;
  }

  const expiresMs = new Date(tenant.subscription_expires_at).getTime();
  const nowMs = new Date().getTime();
  const daysUntilRenewal = Math.ceil(
    (expiresMs - nowMs) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilRenewal < 0 || daysUntilRenewal > RENEWAL_WARNING_DAYS) {
    return null;
  }

  return { daysUntilRenewal, expiresAt: tenant.subscription_expires_at };
}

function SidebarContent({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const linkClass =
    "rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18";

  return (
    <>
      <nav className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/dashboard" className={linkClass}>
          Dashboard
        </Link>
        <Link href="/patients" className={linkClass}>
          Pacientes
        </Link>
        <Link href="/patients/recall" className={linkClass}>
          Pacientes para retorno
        </Link>
        <Link href="/agenda" className={linkClass}>
          Agenda
        </Link>
        <Link href="/finance" className={linkClass}>
          Financeiro
        </Link>
        <Link href="/sterilization" className={linkClass}>
          Esterilização
        </Link>
        <Link href="/settings" className={linkClass}>
          Configurações
        </Link>
        <Link href="/pop-documents" className={linkClass}>
          POPs
        </Link>
        {canAccessAdmin ? (
          <Link
            href="/admin"
            className="rounded-xl bg-white/12 px-3 py-2 font-semibold text-white transition hover:bg-white/18"
          >
            Painel admin
          </Link>
        ) : null}
      </nav>

      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Sair
        </button>
      </form>
    </>
  );
}

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { appUser, tenant } = await requireActiveTenant();
  const canAccessAdmin =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ===
    appUser.email.trim().toLowerCase();

  // Compute renewal banner: show when subscription expires within RENEWAL_WARNING_DAYS
  // and the billing method is not CREDIT_CARD (credit card has auto-debit, no action needed).
  const renewalBanner = computeRenewalBanner(tenant);

  return (
    <div className="min-h-screen bg-transparent">
      <MobileSidebar canAccessAdmin={canAccessAdmin} />

      <div className="md:flex">
        <aside className="hidden bg-[#0F766E] px-5 py-6 text-white md:sticky md:top-0 md:flex md:h-screen md:w-72 md:flex-shrink-0 md:flex-col">
          <div className="flex justify-center">
            <BrandLogoWhite className="h-auto w-36" />
          </div>

          <SidebarContent canAccessAdmin={canAccessAdmin} />
        </aside>

        <main className="w-full px-6 py-8 md:px-8">{children}</main>
      </div>

      {renewalBanner && (
        <RenewalBanner
          daysUntilRenewal={renewalBanner.daysUntilRenewal}
          subscriptionExpiresAt={renewalBanner.expiresAt}
        />
      )}
    </div>
  );
}
