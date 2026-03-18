import { Suspense } from "react";
import { CheckCircle, AlertCircle, Info, Check, Mail } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutAction } from "./actions";
import { BILLING_PLANS, type BillingPeriod, type BillingTier } from "./plans";
import { PeriodToggle } from "./period-toggle";

type SearchParams = Promise<{
  period?: string;
  status?: string;
  error?: string;
}>;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function annualMonthly(annual: number) {
  return formatBRL(annual / 12);
}

function getTrialStatus(trialEndsAt: string, subscriptionStatus: string) {
  if (subscriptionStatus === "active") return { type: "active" as const };
  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { type: "expired" as const, daysLeft: 0 };
  return { type: "trial" as const, daysLeft };
}

const PLAN_FEATURES = [
  "Prontuários ilimitados",
  "Agenda integrada",
  "Agendamento público online",
  "Integração Google Calendar",
  "Notificações por e-mail",
  "Suporte por e-mail",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("trial_ends_at, subscription_status, billing_tier")
    .eq("id", appUser.tenant_id)
    .single();

  const params = await searchParams;
  const period: BillingPeriod =
    params.period === "annual" ? "annual" : "monthly";
  const statusParam = params.status;
  const errorParam = params.error;

  const trialStatus = tenant
    ? getTrialStatus(tenant.trial_ends_at, tenant.subscription_status)
    : { type: "expired" as const, daysLeft: 0 };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Status feedback */}
        {statusParam === "success" && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold text-success">Pagamento recebido!</p>
              <p className="mt-0.5 text-sm text-muted">
                Sua assinatura está sendo processada. Em instantes seu acesso
                será liberado — recarregue a página se necessário.
              </p>
            </div>
          </div>
        )}
        {errorParam && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              {decodeURIComponent(errorParam)}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          {trialStatus.type === "expired" && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
              <AlertCircle className="size-3.5" />
              Trial expirado
            </span>
          )}
          {trialStatus.type === "trial" && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Info className="size-3.5" />
              {trialStatus.daysLeft} dia{trialStatus.daysLeft !== 1 ? "s" : ""}{" "}
              restante{trialStatus.daysLeft !== 1 ? "s" : ""} no trial
            </span>
          )}
          <h1 className="text-3xl font-bold text-foreground">
            {trialStatus.type === "expired"
              ? "Ative sua assinatura para continuar"
              : "Escolha seu plano"}
          </h1>
          <p className="mt-2 text-muted">
            {trialStatus.type === "expired"
              ? "Seu período gratuito terminou. Selecione um plano para voltar a usar o ClinPé."
              : "Acesso completo a prontuários, agenda e agendamento online."}
          </p>
        </div>

        {/* Period toggle */}
        <div className="mb-10 flex justify-center">
          <Suspense>
            <PeriodToggle period={period} />
          </Suspense>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(
            Object.entries(BILLING_PLANS) as [
              BillingTier,
              (typeof BILLING_PLANS)[BillingTier],
            ][]
          ).map(([tier, plan], idx) => {
            const isHighlighted = idx === 1;
            const pricing = plan[period];
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
                      <span className="text-3xl font-extrabold text-foreground">
                        {annualMonthly(pricing.amount)}
                      </span>
                      <span className="text-sm text-muted">/mês</span>
                      <p className="mt-0.5 text-xs text-muted">
                        Cobrado anualmente —{" "}
                        <span className="font-medium text-foreground">
                          {formatBRL(pricing.amount)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-foreground">
                        {formatBRL(pricing.amount)}
                      </span>
                      <span className="text-sm text-muted">/mês</span>
                    </>
                  )}
                </div>

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

                <form action={createCheckoutAction}>
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
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-surface p-5 text-center">
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">
              Mais de 200 pacientes?
            </span>{" "}
            Entre em contato para um plano personalizado.
          </p>
          <a
            href="mailto:contato@clinpe.com.br"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50"
          >
            <Mail className="size-4" />
            Fale conosco
          </a>
        </div>

        {/* Security note */}
        <p className="mt-6 text-center text-xs text-muted">
          Pagamento processado com segurança pelo Asaas. Cancele a qualquer
          momento.
        </p>
      </div>
    </main>
  );
}
