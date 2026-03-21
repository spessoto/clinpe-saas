"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { isValidBrazilTaxId } from "@/lib/brazil-tax-id";
import {
  applyCouponDiscount,
  couponSupportsPeriod,
  formatCouponValue,
  type CouponRow,
} from "@/lib/coupons";
import { continueBillingCheckout, createCheckoutAction } from "./actions";
import type { BillingPeriod, BillingPlanConfig, BillingTier } from "./plans";
import { SelectPlanModal } from "./select-plan-modal";
import type { TenantBillingStatus } from "@/lib/tenant-access";

interface BillingPlansGridProps {
  appUser: AppUser;
  tenant: {
    cpf_cnpj?: string | null;
    billing_tier?: BillingTier | null;
    subscription_status: TenantBillingStatus;
    trial_ends_at: string;
    trial_extension_days: number;
    is_permanent_free_plan: boolean;
  };
  couponPreview?: {
    code: string;
    discount_type: CouponRow["discount_type"];
    discount_value: number;
    applies_to_period: CouponRow["applies_to_period"];
    discounted_cycles_remaining: number;
    discounted_cycles_total: number;
  } | null;
  period: BillingPeriod;
  plans: BillingPlanConfig;
  trialStatus: {
    type: "trial" | "expired" | "active" | "free_permanent";
    daysLeft?: number;
  };
}

const PLAN_FEATURES = [
  "Prontuários ilimitados",
  "Agenda integrada",
  "Agendamento público online",
  "Integração Google Calendar",
  "Notificações por e-mail",
  "Suporte por e-mail",
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function annualMonthly(annual: number) {
  return formatBRL(annual / 12);
}

export function BillingPlansGrid({
  appUser,
  tenant,
  couponPreview,
  period,
  plans,
  trialStatus,
}: BillingPlansGridProps) {
  const [modalTier, setModalTier] = useState<BillingTier | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [modalError, setModalError] = useState<string | undefined>();

  const hasBillingDocument = isValidBrazilTaxId(tenant?.cpf_cnpj);
  const isModalOpen = modalTier !== null;

  const handlePlanClick = (tier: BillingTier) => {
    if (!hasBillingDocument) {
      setModalTier(tier);
      setModalError(undefined);
    } else {
      // Direct checkout via form submit (existing behavior)
      const form = document.querySelector(
        `form[data-plan="${tier}"]`,
      ) as HTMLFormElement;
      if (form) form.submit();
    }
  };

  const handleModalClose = () => {
    setModalTier(null);
    setModalError(undefined);
  };

  const handleModalSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      await continueBillingCheckout(formData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao processar";
      setModalError(message);
      setIsPending(false);
    }
  };

  return (
    <>
      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {(
          Object.entries(plans) as [
            BillingTier,
            BillingPlanConfig[BillingTier],
          ][]
        ).map(([tier, plan], idx) => {
          const isHighlighted = idx === 1;
          const pricing = plan[period];
          const discountedAmount =
            couponPreview && couponSupportsPeriod(couponPreview, period)
              ? applyCouponDiscount(pricing.amount, couponPreview)
              : null;
          const isCurrent =
            trialStatus.type === "active" && tenant?.billing_tier === tier;

          return (
            <div
              key={tier}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isHighlighted
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-gray-200 bg-surface"
              }`}
            >
              {isHighlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-bold text-white">
                  Mais popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 rounded-full bg-success px-3 py-0.5 text-xs font-bold text-white">
                  Plano atual
                </span>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  {plan.label}
                </h2>
                <p className="text-sm text-muted">
                  Até {plan.maxPatients} pacientes
                </p>
              </div>

              <div className="mb-1">
                {period === "annual" ? (
                  <>
                    {discountedAmount !== null ? (
                      <>
                        <span className="text-sm text-muted line-through">
                          {annualMonthly(pricing.amount)}
                        </span>
                        <div>
                          <span className="text-3xl font-extrabold text-foreground">
                            {annualMonthly(discountedAmount)}
                          </span>
                          <span className="text-sm text-muted">/mês</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-foreground">
                          {annualMonthly(pricing.amount)}
                        </span>
                        <span className="text-sm text-muted">/mês</span>
                      </>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      Cobrado anualmente —{" "}
                      <span className="font-medium text-foreground">
                        {formatBRL(discountedAmount ?? pricing.amount)}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    {discountedAmount !== null ? (
                      <>
                        <span className="text-sm text-muted line-through">
                          {formatBRL(pricing.amount)}
                        </span>
                        <div>
                          <span className="text-3xl font-extrabold text-foreground">
                            {formatBRL(discountedAmount)}
                          </span>
                          <span className="text-sm text-muted">/mês</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-foreground">
                          {formatBRL(pricing.amount)}
                        </span>
                        <span className="text-sm text-muted">/mês</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {discountedAmount !== null ? (
                <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                  Cupom {couponPreview?.code} aplicado:{" "}
                  {formatCouponValue(couponPreview!)} por mais{" "}
                  {couponPreview?.discounted_cycles_remaining} ciclo(s)
                </p>
              ) : null}

              <ul className="my-6 flex-1 space-y-2">
                {PLAN_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted"
                  >
                    <Check className="size-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              {hasBillingDocument ? (
                // Direct form submit to createCheckoutAction when data is complete
                <form
                  action={createCheckoutAction}
                  data-plan={tier}
                  className="w-full"
                >
                  <input type="hidden" name="tier" value={tier} />
                  <input type="hidden" name="period" value={period} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      isHighlighted
                        ? "bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                        : "border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
                    }`}
                  >
                    {isCurrent ? "Plano ativo" : "Assinar com Asaas"}
                  </button>
                </form>
              ) : (
                // Button to open modal for completing billing data
                <button
                  type="button"
                  onClick={() => handlePlanClick(tier)}
                  disabled={isCurrent}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    isHighlighted
                      ? "bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                      : "border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
                  }`}
                >
                  {isCurrent ? "Plano ativo" : "Assinar agora!"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for completing billing data */}
      <SelectPlanModal
        isOpen={isModalOpen}
        tier={modalTier}
        period={period}
        plans={plans}
        couponPreview={couponPreview}
        onClose={handleModalClose}
        appUser={appUser}
        tenant={tenant}
        onSubmitAction={handleModalSubmit}
        isPending={isPending}
        hasError={modalError}
      />
    </>
  );
}
