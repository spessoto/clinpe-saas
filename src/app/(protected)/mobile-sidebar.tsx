"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { signOutAction } from "@/app/auth-actions";
import { BrandLogoWhite } from "@/components/brand-logo";

type MobileSidebarProps = {
  canAccessAdmin: boolean;
};

export function MobileSidebar({ canAccessAdmin }: MobileSidebarProps) {
  // `mounted` controls whether the overlay/aside are in the DOM.
  // `isOpen` drives the transition classes (false = animating out).
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DURATION_MS = 300;

  const linkClass =
    "rounded-xl px-3 py-2 font-semibold text-white transition hover:bg-white/18";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  return (
    <div className="relative z-40 md:hidden">
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
          {/* Overlay */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className={[
              "fixed inset-0 bg-slate-900/45 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          {/* Sidebar panel */}
          <aside
            className={[
              "fixed inset-y-0 left-0 w-72 overflow-y-auto bg-[#0F766E] px-5 py-6 text-white shadow-2xl transition-transform duration-300",
              isOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <div className="flex justify-center">
              <BrandLogoWhite className="h-auto w-36" />
            </div>

            <nav className="mt-6 flex flex-col gap-2 text-sm">
              <Link href="/dashboard" className={linkClass} onClick={closeMenu}>
                Dashboard
              </Link>
              <Link href="/patients" className={linkClass} onClick={closeMenu}>
                Pacientes
              </Link>
              <Link
                href="/patients/recall"
                className={linkClass}
                onClick={closeMenu}
              >
                Pacientes para retorno
              </Link>
              <Link href="/agenda" className={linkClass} onClick={closeMenu}>
                Agenda
              </Link>
              <Link href="/finance" className={linkClass} onClick={closeMenu}>
                Financeiro
              </Link>
              <Link
                href="/sterilization"
                className={linkClass}
                onClick={closeMenu}
              >
                Esterilização
              </Link>
              <Link href="/settings" className={linkClass} onClick={closeMenu}>
                Configurações
              </Link>
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
                  className="rounded-xl bg-white/12 px-3 py-2 font-semibold text-white transition hover:bg-white/18"
                  onClick={closeMenu}
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
          </aside>
        </>
      ) : null}
    </div>
  );
}
