import { AlertCircle, CheckCircle2 } from "lucide-react";

import {
  getAdminPricingData,
  updateBillingPlanPriceAction,
} from "@/app/admin/pricing/actions";
import type { BillingTier } from "@/app/billing/plans";

export const revalidate = 60;

type SearchParams = Promise<{
  error?: string;
  success?: string;
}>;

const PLAN_ORDER: BillingTier[] = ["tier_1", "tier_2", "tier_3"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { plans, audit } = await getAdminPricingData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de preços</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Edite os valores dos planos e propague automaticamente para landing,
          página de billing e checkout.
        </p>
      </div>

      {params.error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-900">{params.error}</p>
        </div>
      ) : null}

      {params.success ? (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-900">{params.success}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = plans[tier];
          const auditRow = audit.find((item) => item.tier === tier);

          return (
            <form
              key={tier}
              action={updateBillingPlanPriceAction}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <input type="hidden" name="tier" value={tier} />

              <h2 className="text-lg font-bold text-foreground">
                {plan.label}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Atual: {formatCurrency(plan.monthly.amount)} / mês •{" "}
                {formatCurrency(plan.annual.amount)} / ano
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">
                    Nome do plano
                  </span>
                  <input
                    type="text"
                    name="label"
                    required
                    defaultValue={plan.label}
                    className="w-full"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">
                    Limite de pacientes
                  </span>
                  <input
                    type="number"
                    name="max_patients"
                    min={1}
                    required
                    defaultValue={plan.maxPatients}
                    className="w-full"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">
                    Mensal (R$)
                  </span>
                  <input
                    type="number"
                    name="monthly_amount"
                    step="0.01"
                    min={1}
                    required
                    defaultValue={plan.monthly.amount}
                    className="w-full"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-foreground">Anual (R$)</span>
                  <input
                    type="number"
                    name="annual_amount"
                    step="0.01"
                    min={1}
                    required
                    defaultValue={plan.annual.amount}
                    className="w-full"
                  />
                </label>
              </div>

              <button type="submit" className="btn-gradient mt-5 w-full py-2.5">
                Salvar alterações
              </button>

              <p className="mt-3 text-xs text-muted-foreground">
                Última atualização:{" "}
                {auditRow?.updated_at
                  ? new Date(auditRow.updated_at).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </form>
          );
        })}
      </div>
    </div>
  );
}
