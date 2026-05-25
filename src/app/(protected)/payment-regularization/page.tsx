import { AlertTriangle, CreditCard, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

import { requireActiveTenant } from "@/lib/auth";
import { checkTenantPaymentStatus } from "@/lib/tenant-access";

export const metadata = {
  title: "Regularize seu plano - ClinPé",
  description: "Regularize o pagamento de sua assinatura",
};

function PaymentStatusBadge() {
  return (
    <div className="rounded-lg bg-red-50 p-6 border border-red-200">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-red-100 p-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-900">
            Pagamento em Atraso
          </h2>
          <p className="mt-1 text-sm text-red-700">
            Sua assinatura requer regularização imediata
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  subtext,
}: {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-teal-600" />
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

export default async function PaymentRegularizationPage() {
  const { tenant } = await requireActiveTenant();

  // Verify that user is indeed in past_due status
  const paymentStatus = checkTenantPaymentStatus(tenant);
  if (paymentStatus !== "past_due") {
    // If not past_due, redirect to dashboard
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const daysOverdue = tenant.subscription_expires_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(tenant.subscription_expires_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const billingMethodLabel: Record<string, string> = {
    CREDIT_CARD: "Cartão de crédito",
    BOLETO: "Boleto bancário",
    PIX: "PIX",
    UNDEFINED: "Indefinido",
  };

  const displayBillingMethod =
    billingMethodLabel[tenant.subscription_billing_method || "UNDEFINED"] ||
    "Indefinido";

  const tierLabel: Record<string, string> = {
    tier_1: "Essencial",
    tier_2: "Pro",
    tier_3: "Clínica",
    free_trial: "Trial",
  };

  const displayTier = tierLabel[tenant.billing_tier || "free_trial"] || "Trial";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Regularize seu plano
            </h1>
            <p className="mt-2 text-gray-600">
              Sua assinatura está com o pagamento pendente. Por favor,
              regularize para continuar acessando todos os serviços.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Status Alert */}
        <PaymentStatusBadge />

        {/* Info Cards Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={Clock}
            title="Dias em atraso"
            value={`${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"}`}
            subtext="Desde a data de vencimento"
          />
          <InfoCard
            icon={CreditCard}
            title="Método de pagamento"
            value={displayBillingMethod}
            subtext="Salvo na sua conta"
          />
        </div>

        {/* Subscription Details */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Detalhes da assinatura
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Clínica:</span>
              <span className="font-medium text-gray-900">{tenant.name}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="text-gray-600">Plano atual:</span>
              <span className="font-medium text-gray-900">{displayTier}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="text-gray-600">Status:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                Pagamento pendente
              </span>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-12 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              <strong>⚠️ Atenção:</strong> Seu acesso aos serviços está limitado
              até a regularização do pagamento. Clique no botão abaixo para
              acessar o gateway de pagamento e regularizar sua conta.
            </p>
          </div>

          <a
            href="https://app.asaas.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 active:scale-95"
          >
            <CreditCard className="h-5 w-5" />
            Pagar agora via Asaas
          </a>

          <p className="text-center text-xs text-gray-600">
            Você será redirecionado para o portal de pagamento seguro do Asaas.
          </p>
        </div>

        {/* Help Section */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h3 className="text-sm font-semibold text-gray-700">
            Precisa de ajuda?
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Se você está tendo problemas para realizar o pagamento ou tem
            dúvidas sobre sua assinatura, por favor{" "}
            <Link
              href="/contato"
              className="font-medium text-teal-600 hover:text-teal-700"
            >
              entre em contato conosco
            </Link>
            . Nossa equipe está aqui para ajudar.
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-lg bg-white p-4 border border-gray-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-teal-600" />
              <div>
                <p className="font-medium text-gray-900">Pagamento seguro</p>
                <p className="mt-1 text-gray-600 text-xs">
                  Todos os pagamentos são processados de forma segura
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 border border-gray-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-teal-600" />
              <div>
                <p className="font-medium text-gray-900">Acesso imediato</p>
                <p className="mt-1 text-gray-600 text-xs">
                  Após o pagamento, acesso restaurado automaticamente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
