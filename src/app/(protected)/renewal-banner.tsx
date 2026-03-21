"use client";

import { AlertCircle, X, CreditCard } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface RenewalBannerProps {
  daysUntilRenewal: number;
  subscriptionExpiresAt: string;
}

export function RenewalBanner({
  daysUntilRenewal,
  subscriptionExpiresAt,
}: RenewalBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const expiryDate = new Date(subscriptionExpiresAt).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  );

  const isUrgent = daysUntilRenewal <= 1;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 ${
        isUrgent
          ? "border-destructive/30 bg-destructive/10"
          : "border-warning/30 bg-warning/10"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle
            className={`size-5 shrink-0 ${isUrgent ? "text-destructive" : "text-warning"}`}
          />
          <p
            className={`text-sm font-medium ${isUrgent ? "text-destructive" : "text-warning"}`}
          >
            {daysUntilRenewal === 0 ? (
              <>
                Sua assinatura vence <strong>hoje</strong> ({expiryDate}).
              </>
            ) : (
              <>
                Sua assinatura vence em{" "}
                <strong>
                  {daysUntilRenewal} dia{daysUntilRenewal !== 1 ? "s" : ""}
                </strong>{" "}
                ({expiryDate}).
              </>
            )}{" "}
            <span className="text-muted">
              Renove agora para não perder o acesso.
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <CreditCard className="size-3.5" />
            Renovar assinatura
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted hover:bg-black/5"
            aria-label="Fechar aviso"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
