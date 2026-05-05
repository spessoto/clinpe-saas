"use client";

import { useRef, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { formatBrazilTaxId } from "@/lib/brazil-tax-id";
import {
  applyCouponDiscount,
  couponSupportsPeriod,
  formatCouponValue,
  type CouponRow,
} from "@/lib/coupons";
import type { BillingPeriod, BillingPlanConfig, BillingTier } from "./plans";

interface SelectPlanModalProps {
  isOpen: boolean;
  tier: BillingTier | null;
  period: BillingPeriod;
  plans: BillingPlanConfig;
  couponPreview?: {
    code: string;
    discount_type: CouponRow["discount_type"];
    discount_value: number;
    applies_to_period: CouponRow["applies_to_period"];
    discounted_cycles_remaining: number;
    discounted_cycles_total: number;
  } | null;
  onClose: () => void;
  appUser: AppUser;
  tenant: {
    cpf_cnpj?: string | null;
  };
  onSubmitAction: (formData: FormData) => Promise<void>;
  isPending?: boolean;
  hasError?: string;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SelectPlanModal({
  isOpen,
  tier,
  period,
  plans,
  couponPreview,
  onClose,
  appUser,
  tenant,
  onSubmitAction,
  isPending = false,
  hasError,
}: SelectPlanModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const plan = tier ? plans[tier] : null;
  const pricing = plan ? plan[period] : null;
  const discountedAmount =
    pricing && couponPreview && couponSupportsPeriod(couponPreview, period)
      ? applyCouponDiscount(pricing.amount, couponPreview)
      : null;

  // Sync dialog open state with isOpen prop
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  const handleDialogClose = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("tier", tier || "");
    formData.append("period", period);
    onSubmitAction(formData);
  };

  if (!plan || !pricing) {
    return null;
  }

  const annualMonthly =
    period === "annual" ? pricing.amount / 12 : pricing.amount;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      className="min-w-80 max-w-md border-0 rounded-2xl bg-white shadow-2xl"
    >
      {/* Content wrapper with scroll if needed */}
      <div className="overflow-y-auto max-h-[calc(90vh-3rem)]">
        {/* Header with close button */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Confirmar assinatura
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Você será redirecionado para o Asaas para finalizar o pagamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-foreground flex-shrink-0"
            type="button"
          >
            <X className="size-5" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>

        {/* Error banner */}
        {hasError && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{hasError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Plan summary */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-muted">{plan.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              {discountedAmount !== null ? (
                <>
                  <span className="text-sm text-muted line-through">
                    {formatBRL(annualMonthly)}
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatBRL(
                      period === "annual"
                        ? discountedAmount / 12
                        : discountedAmount,
                    )}
                  </span>
                  <span className="text-sm text-muted">/mês</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-foreground">
                    {formatBRL(annualMonthly)}
                  </span>
                  <span className="text-sm text-muted">/mês</span>
                </>
              )}
            </div>
            {period === "annual" && (
              <p className="mt-1 text-xs text-muted">
                Cobrado anualmente —{" "}
                {formatBRL(discountedAmount ?? pricing.amount)}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Até {plan.maxPatients} pacientes
            </p>
            {discountedAmount !== null ? (
              <p className="mt-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                Cupom {couponPreview?.code} aplicado:{" "}
                {formatCouponValue(couponPreview!)} por mais{" "}
                {couponPreview?.discounted_cycles_remaining} ciclo(s)
              </p>
            ) : null}
          </div>

          {/* CPF/CNPJ field */}
          <div>
            <label
              htmlFor="cpf_cnpj"
              className="block text-sm font-medium text-foreground"
            >
              CPF ou CNPJ <span className="text-destructive">*</span>
            </label>
            <input
              id="cpf_cnpj"
              type="text"
              name="cpf_cnpj"
              required
              defaultValue={formatBrazilTaxId(tenant?.cpf_cnpj) || ""}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
            />
          </div>

          {/* Payment method selection */}
          <div>
            <p className="block text-sm font-medium text-foreground">
              Método de pagamento <span className="text-destructive">*</span>
            </p>
            <div className="mt-2 space-y-2">
              {[
                { value: "BOLETO", label: "Boleto" },
                { value: "CREDIT_CARD", label: "Cartão de crédito" },
                { value: "PIX", label: "PIX" },
              ].map((method) => (
                <label key={method.value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="billing_method"
                    value={method.value}
                    defaultChecked={method.value === "BOLETO"}
                    className="size-4 border-slate-300 text-primary accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {method.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* E-mail display-only */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              E-mail
            </label>
            <div className="mt-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-muted">
              {appUser.email}
            </div>
            <p className="mt-1 text-xs text-muted">
              Para alterar, acesse suas configurações.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 disabled:opacity-50 sm:flex-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 sm:flex-1"
            >
              {isPending ? "Processando..." : "Confirmar e continuar"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
