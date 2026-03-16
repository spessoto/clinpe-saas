import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Webhook para processar eventos de pagamento.
 * 
 * Suportará:
 * - Stripe: invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated
 * - Mercado Pago: payment.success, subscription.updated
 * 
 * Esperado no body:
 * {
 *   provider: "stripe" | "mercado_pago",
 *   event: "payment_succeeded" | "subscription_updated" | ...,
 *   data: {
 *     stripe_customer_id?: string,
 *     billing_tier?: "tier_1" | "tier_2" | "tier_3",
 *     max_patients_allowed?: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, event, data } = body;

    // TODO: Validar assinatura/token do webhook (Stripe, Mercado Pago)
    // Por segurança, sempre validar que o request veio do provedor legítimo
    // const signature = body.signature;

    if (!provider || !event || !data) {
      return NextResponse.json(
        { error: "Campo(s) obrigatório(s) faltando" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Atualizar tenant com informações de pagamento
    if (data.stripe_customer_id) {
      const { error } = await supabase
        .from("tenants")
        .update({
          stripe_customer_id: data.stripe_customer_id,
          billing_tier: data.billing_tier || "free_trial",
          max_patients_allowed: data.max_patients_allowed || 10,
        })
        .eq("stripe_customer_id", data.stripe_customer_id);

      if (error) {
        console.error("Erro ao atualizar tenant:", error);
        return NextResponse.json(
          { error: "Falha ao atualizar tenant no banco de dados" },
          { status: 500 }
        );
      }
    }

    // Log para auditoria
    console.log(`[WEBHOOK] ${provider} - ${event}`, {
      stripe_customer_id: data.stripe_customer_id,
      billing_tier: data.billing_tier,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: `Evento ${event} processado com sucesso` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[WEBHOOK] Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 }
    );
  }
}

/**
 * Exemplo de request Stripe:
 * 
 * POST /api/payments/webhook
 * {
 *   "provider": "stripe",
 *   "event": "customer.subscription.updated",
 *   "data": {
 *     "stripe_customer_id": "cus_ABC123",
 *     "billing_tier": "tier_2",
 *     "max_patients_allowed": 50
 *   }
 * }
 * 
 * Exemplo de request Mercado Pago:
 * 
 * POST /api/payments/webhook
 * {
 *   "provider": "mercado_pago",
 *   "event": "subscription.updated",
 *   "data": {
 *     "stripe_customer_id": "mp_cus_ABC123",
 *     "billing_tier": "tier_3",
 *     "max_patients_allowed": 100
 *   }
 * }
 */
