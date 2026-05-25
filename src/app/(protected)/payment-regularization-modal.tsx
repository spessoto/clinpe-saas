import Link from "next/link";
import { AlertCircle, CreditCard } from "lucide-react";

import type { Tenant } from "@/lib/auth";

interface PaymentRegularizationModalProps {
  tenant: Tenant;
}

export async function PaymentRegularizationModal({
  tenant,
}: PaymentRegularizationModalProps) {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysOverdue = tenant.subscription_expires_at
    ? Math.floor(
        (now - new Date(tenant.subscription_expires_at).getTime()) /
          (1000 * 60 * 60 * 24),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Regularize seu plano
              </h1>
              <p className="text-sm text-gray-600">
                Seu pagamento está pendente de regularização
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-8">
          {/* Status Info */}
          <div className="space-y-4 rounded-lg bg-orange-50 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Status:</p>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-600" />
                <span className="text-sm font-semibold text-red-600">
                  Pagamento em atraso
                </span>
              </div>
            </div>

            {daysOverdue > 0 && (
              <div className="space-y-2 border-t border-orange-200 pt-4">
                <p className="text-sm font-medium text-gray-700">
                  Dias em atraso:
                </p>
                <p className="text-2xl font-bold text-red-600">{daysOverdue}</p>
              </div>
            )}

            <div className="space-y-2 border-t border-orange-200 pt-4">
              <p className="text-sm font-medium text-gray-700">
                Método de pagamento:
              </p>
              <p className="text-sm text-gray-600">{displayBillingMethod}</p>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Sua assinatura está com o pagamento pendente. Para continuar
              acessando todos os serviços da ClinPé, regularize seu plano
              através do nosso gateway de pagamento.
            </p>
            <p className="text-xs text-gray-600">
              ⚠️ Funcionalidades estão limitadas até a regularização do
              pagamento.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <a
              href={`https://app.asaas.com/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 font-semibold text-white transition hover:brightness-110"
            >
              <CreditCard className="h-5 w-5" />
              Pagar agora via Asaas
            </a>

            <p className="text-center text-xs text-gray-600">
              Após realizar o pagamento, sua conta será regularizada
              automaticamente
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-600">
              Dúvidas sobre o pagamento?{" "}
              <Link
                href="/contato"
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                Entre em contato conosco
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
