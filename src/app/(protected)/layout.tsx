import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogoWhite } from "@/components/brand-logo";
import { requireActiveTenant, type Tenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

function getBillingCtaLabel(tenant: Tenant) {
  const hasActivePaidPlan =
    tenant.subscription_status === "active" &&
    tenant.billing_tier !== "free_trial";

  return hasActivePaidPlan ? "Faça Upgrade" : "Faça sua assinatura";
}

function SidebarContent({
  canAccessAdmin,
  billingCtaLabel,
  unreadNotificationCount,
  isOwner,
  isTier3,
}: {
  canAccessAdmin: boolean;
  billingCtaLabel: string;
  unreadNotificationCount: number;
  isOwner: boolean;
  isTier3: boolean;
}) {
  const linkClass =
    "rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/18 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";
  const billingLinkClass =
    "block rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] px-4 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:brightness-105 [@media(max-height:860px)]:px-3 [@media(max-height:860px)]:py-3 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-3 [@media(max-height:720px)]:py-2.5 [@media(max-height:720px)]:text-xs";
  const adminLinkClass =
    "rounded-xl bg-white/12 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/18 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";
  const signOutButtonClass =
    "w-full rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col [@media(max-height:860px)]:mt-3 [@media(max-height:720px)]:mt-2">
      <nav className="flex flex-col gap-2 [@media(max-height:860px)]:gap-1.5 [@media(max-height:720px)]:gap-1">
        <Link href="/dashboard" className={linkClass}>
          Dashboard
        </Link>
        <Link href="/patients" className={linkClass}>
          Pacientes
        </Link>
        <Link href="/patients/recall" className={linkClass}>
          <span className="[@media(max-height:720px)]:hidden">
            Pacientes para retorno
          </span>
          <span className="hidden [@media(max-height:720px)]:inline">
            Retornos
          </span>
        </Link>
        <Link href="/agenda" className={linkClass}>
          Agenda
        </Link>
        <Link href="/notifications" className={linkClass}>
          <span className="inline-flex items-center gap-2">
            <span>Notificações</span>
            {unreadNotificationCount > 0 ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#0F766E]">
                {unreadNotificationCount}
              </span>
            ) : null}
          </span>
        </Link>
        {isOwner ? (
          <Link href="/finance" className={linkClass}>
            Financeiro
          </Link>
        ) : null}
        <Link href="/sterilization" className={linkClass}>
          Esterilização
        </Link>
        <Link href="/settings" className={linkClass}>
          Configurações
        </Link>
        {isOwner && isTier3 ? (
          <Link href="/settings/team" className={linkClass}>
            Equipe
          </Link>
        ) : null}
        <Link href="/pop-documents" className={linkClass}>
          POPs
        </Link>
        {canAccessAdmin ? (
          <Link href="/admin" className={adminLinkClass}>
            Painel admin
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto pt-6 [@media(max-height:860px)]:pt-4 [@media(max-height:720px)]:pt-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm [@media(max-height:860px)]:p-1.5 [@media(max-height:720px)]:p-1">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 [@media(max-height:860px)]:px-1.5 [@media(max-height:860px)]:pb-1.5 [@media(max-height:860px)]:text-[11px] [@media(max-height:720px)]:px-1 [@media(max-height:720px)]:pb-1 [@media(max-height:720px)]:text-[10px]">
            Assinatura
          </p>
          <Link href="/billing" className={billingLinkClass}>
            {billingCtaLabel}
          </Link>
        </div>

        <form
          action={signOutAction}
          className="mt-4 [@media(max-height:860px)]:mt-3 [@media(max-height:720px)]:mt-2"
        >
          <button type="submit" className={signOutButtonClass}>
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const isOwner = appUser.role === "owner";
  const isTier3 = tenant.billing_tier === "tier_3";
  const canAccessAdmin =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ===
    appUser.email.trim().toLowerCase();
  const { count: unreadNotificationCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .is("read_at", null);

  // Compute renewal banner: show when subscription expires within RENEWAL_WARNING_DAYS
  // and the billing method is not CREDIT_CARD (credit card has auto-debit, no action needed).
  const renewalBanner = computeRenewalBanner(tenant);
  const billingCtaLabel = getBillingCtaLabel(tenant);

  return (
    <div className="min-h-screen bg-transparent">
      <MobileSidebar
        canAccessAdmin={canAccessAdmin}
        billingCtaLabel={billingCtaLabel}
        unreadNotificationCount={unreadNotificationCount ?? 0}
        isOwner={isOwner}
        isTier3={isTier3}
      />

      <div className="md:flex">
        <aside className="hidden bg-[#0F766E] px-5 py-6 text-white print:hidden md:sticky md:top-0 md:flex md:h-dvh md:max-h-dvh md:w-72 md:flex-shrink-0 md:flex-col md:overflow-y-auto [@media(max-height:860px)]:px-4 [@media(max-height:860px)]:py-4 [@media(max-height:720px)]:px-3 [@media(max-height:720px)]:py-3">
          <div className="flex justify-center">
            <BrandLogoWhite className="h-auto w-36 [@media(max-height:860px)]:w-32 [@media(max-height:720px)]:w-28" />
          </div>

          <SidebarContent
            canAccessAdmin={canAccessAdmin}
            billingCtaLabel={billingCtaLabel}
            unreadNotificationCount={unreadNotificationCount ?? 0}
            isOwner={isOwner}
            isTier3={isTier3}
          />
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
