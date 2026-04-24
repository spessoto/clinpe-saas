"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogoWhite } from "@/components/brand-logo";

type MobileSidebarProps = {
  canAccessAdmin: boolean;
  billingCtaLabel: string;
  unreadNotificationCount: number;
  isOwner: boolean;
  isTier3: boolean;
};

export function MobileSidebar({
  canAccessAdmin,
  billingCtaLabel,
  unreadNotificationCount,
  isOwner,
  isTier3,
}: MobileSidebarProps) {
  // `mounted` controls whether the overlay/aside are in the DOM.
  // `isOpen` drives the transition classes (false = animating out).
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DURATION_MS = 300;

  const linkClass =
    "rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/18 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";
  const billingLinkClass =
    "block rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] px-4 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:brightness-105 [@media(max-height:860px)]:px-3 [@media(max-height:860px)]:py-3 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-3 [@media(max-height:720px)]:py-2.5 [@media(max-height:720px)]:text-xs";
  const adminLinkClass =
    "rounded-xl bg-white/12 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/18 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";
  const signOutButtonClass =
    "w-full rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 [@media(max-height:860px)]:px-2.5 [@media(max-height:860px)]:py-1.5 [@media(max-height:860px)]:text-[13px] [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:text-xs";

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMounted(true);
    // Two rAFs ensure the element is painted before the transition class is applied.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsOpen(true));
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
    closeTimerRef.current = setTimeout(() => setMounted(false), DURATION_MS);
  };

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted]);

  return (
    <div className="print:hidden md:hidden">
      <div className="flex items-center justify-between bg-[#0F766E] px-5 py-4 text-white">
        <BrandLogoWhite className="h-auto w-32" />
        <button
          type="button"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isOpen}
          onClick={isOpen ? closeMenu : openMenu}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 bg-white/10"
        >
          <span className="flex w-4 flex-col gap-1.5">
            <span className="block h-0.5 w-full bg-white" />
            <span className="block h-0.5 w-full bg-white" />
            <span className="block h-0.5 w-full bg-white" />
          </span>
        </button>
      </div>

      {mounted ? (
        <>
          {/* Overlay — z-40 no root stacking context, cobre o conteúdo da página */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className={[
              "fixed inset-0 z-40 bg-slate-900/45 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          {/* Sidebar panel — z-50 fica acima do overlay */}
          <aside
            className={[
              "fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#0F766E] px-5 py-6 text-white shadow-2xl transition-transform duration-300 [@media(max-height:860px)]:px-4 [@media(max-height:860px)]:py-4 [@media(max-height:720px)]:px-3 [@media(max-height:720px)]:py-3",
              isOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <div className="flex justify-center">
              <BrandLogoWhite className="h-auto w-36 [@media(max-height:860px)]:w-32 [@media(max-height:720px)]:w-28" />
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col [@media(max-height:860px)]:mt-3 [@media(max-height:720px)]:mt-2">
              <nav className="flex flex-col gap-2 [@media(max-height:860px)]:gap-1.5 [@media(max-height:720px)]:gap-1">
                <Link
                  href="/dashboard"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  Dashboard
                </Link>
                <Link
                  href="/patients"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  Pacientes
                </Link>
                <Link
                  href="/patients/recall"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  <span className="[@media(max-height:720px)]:hidden">
                    Pacientes para retorno
                  </span>
                  <span className="hidden [@media(max-height:720px)]:inline">
                    Retornos
                  </span>
                </Link>
                <Link href="/agenda" className={linkClass} onClick={closeMenu}>
                  Agenda
                </Link>
                <Link
                  href="/notifications"
                  className={linkClass}
                  onClick={closeMenu}
                >
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
                  <Link
                    href="/finance"
                    className={linkClass}
                    onClick={closeMenu}
                  >
                    Financeiro
                  </Link>
                ) : null}
                <Link
                  href="/sterilization"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  Esterilização
                </Link>
                <Link
                  href="/settings"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  Configurações
                </Link>
                {isOwner && isTier3 ? (
                  <Link
                    href="/settings/team"
                    className={linkClass}
                    onClick={closeMenu}
                  >
                    Equipe
                  </Link>
                ) : null}
                <Link
                  href="/pop-documents"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  POPs
                </Link>
                {canAccessAdmin ? (
                  <Link
                    href="/admin"
                    className={adminLinkClass}
                    onClick={closeMenu}
                  >
                    Painel admin
                  </Link>
                ) : null}
              </nav>

              <div className="mt-auto pt-6 [@media(max-height:860px)]:pt-4 [@media(max-height:720px)]:pt-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm [@media(max-height:860px)]:p-1.5 [@media(max-height:720px)]:p-1">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 [@media(max-height:860px)]:px-1.5 [@media(max-height:860px)]:pb-1.5 [@media(max-height:860px)]:text-[11px] [@media(max-height:720px)]:px-1 [@media(max-height:720px)]:pb-1 [@media(max-height:720px)]:text-[10px]">
                    Assinatura
                  </p>
                  <Link
                    href="/billing"
                    className={billingLinkClass}
                    onClick={closeMenu}
                  >
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
          </aside>
        </>
      ) : null}
    </div>
  );
}
