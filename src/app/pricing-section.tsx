"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export type PlanCard = {
  name: string;
  monthly: string;
  annual: string;
  limit: string;
  featured: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: string[];
};

export function PricingSection({ planCards }: { planCards: PlanCard[] }) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const t = useTranslations("PricingSection");

  return (
    <section
      id="precos"
      className="bg-[radial-gradient(circle_at_15%_10%,rgba(15,143,135,0.13),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(33,66,166,0.13),transparent_28%),linear-gradient(180deg,#f6fbff_0%,#f5fcfb_100%)] px-6 py-24 md:px-8 md:py-28"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center">
        <div className="mb-14 max-w-2xl text-center">
          <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-600">
            {t("subtitle")}
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={[
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                billingCycle === "monthly"
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              {t("billingMonthly")}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={[
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                billingCycle === "annual"
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              {t("billingAnnual")}
            </button>
          </div>
        </div>

        <div className="grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-4">
          {planCards.map((plan) => (
            <article
              key={plan.name}
              className={[
                "relative flex h-full flex-col rounded-3xl border bg-gradient-to-b p-7 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.4)] sm:p-8",
                plan.featured
                  ? "border-2 border-primary/30 from-white to-primary/5"
                  : "border-slate-200/80 from-white to-slate-50/70",
              ].join(" ")}
            >
              {plan.featured ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  {t("mostChosen")}
                </div>
              ) : null}

              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-secondary">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {plan.limit}
                </p>
                <div className="mt-4 flex items-end justify-center gap-1">
                  {plan.monthly === "custom" ? (
                    <span className="text-3xl font-black tracking-tight text-secondary">
                      {t("customPrice")}
                    </span>
                  ) : (
                    <>
                      <span className="text-base text-slate-600">R$</span>
                      <span className="text-5xl font-black tracking-tighter text-secondary">
                        {billingCycle === "monthly"
                          ? plan.monthly
                          : plan.annual}
                      </span>
                      <span className="pb-1 text-slate-600">
                        {billingCycle === "monthly" ? t("monthSuffix") : t("yearSuffix")}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {plan.monthly === "custom"
                    ? t("customPriceNote")
                    : billingCycle === "monthly"
                      ? t("annualNote", { annual: plan.annual })
                      : t("monthlyNoteAlt")}
                </p>
              </div>

              <ul className="mb-7 flex-1 space-y-4">
                {plan.features.map((item) => (
                  <li
                    key={`${plan.name}-${item}`}
                    className="flex items-start gap-3 text-slate-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              {plan.ctaHref.startsWith("mailto:") ? (
                <a
                  href={plan.ctaHref}
                  className={[
                    "inline-flex w-full justify-center rounded-xl px-4 py-3 text-base font-bold transition",
                    plan.featured
                      ? "btn-gradient"
                      : "bg-slate-200/80 text-secondary hover:bg-slate-200",
                  ].join(" ")}
                >
                  {plan.ctaLabel}
                </a>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className={[
                    "inline-flex w-full justify-center rounded-xl px-4 py-3 text-base font-bold transition",
                    plan.featured
                      ? "btn-gradient"
                      : "bg-slate-200/80 text-secondary hover:bg-slate-200",
                  ].join(" ")}
                >
                  {plan.ctaLabel}
                </Link>
              )}
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          {t("noCommitment")}
        </p>
      </div>
    </section>
  );
}
