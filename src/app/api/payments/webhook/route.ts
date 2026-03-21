import { NextRequest, NextResponse } from "next/server";

import type { CouponRedemptionRow } from "@/lib/coupons";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAsaasEnv } from "@/lib/env";

type AsaasWebhookBody = {
  event?: string;
  subscription?: {
    id?: string;
  };
  payment?: {
    id?: string;
    subscription?: string;
  };
};

type AsaasSubscriptionResponse = {
  id: string;
  customer: string | null;
  externalReference: string | null;
  status: string;
  nextDueDate?: string | null;
  billingType?: string | null;
};

const EVENTS_TO_PROCESS = new Set([
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_DELETED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_OVERDUE",
]);

function mapAsaasStatus(status: string): "trialing" | "active" | "past_due" {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "active";
  if (["INACTIVE", "CANCELED", "EXPIRED", "OVERDUE"].includes(normalized)) {
    return "past_due";
  }
  return "trialing";
}

function parseExternalReference(reference: string | null) {
  if (!reference) return null;
  const [tenantId, tier, maxStr] = reference.split("|");
  const maxPatients = Number.parseInt(maxStr, 10);
  if (!tenantId || !tier || Number.isNaN(maxPatients)) return null;
  return { tenantId, tier, maxPatients };
}

async function fetchAsaasSubscription(
  subscriptionId: string,
  apiBase: string,
  apiKey: string,
) {
  const response = await fetch(`${apiBase}/subscriptions/${subscriptionId}`, {
    method: "GET",
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro ao consultar assinatura Asaas (${response.status}): ${text || response.statusText}`,
    );
  }

  return (await response.json()) as AsaasSubscriptionResponse;
}

async function updateAsaasSubscriptionAmount(input: {
  subscriptionId: string;
  value: number;
  apiBase: string;
  apiKey: string;
}) {
  const response = await fetch(
    `${input.apiBase}/subscriptions/${input.subscriptionId}`,
    {
      method: "PUT",
      headers: {
        access_token: input.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: input.value,
        updatePendingPayments: false,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro ao atualizar assinatura Asaas (${response.status}): ${text || response.statusText}`,
    );
  }
}

export async function POST(request: NextRequest) {
  const env = getAsaasEnv();
  const webhookToken =
    request.headers.get("asaas-access-token") ??
    request.headers.get("x-asaas-access-token") ??
    "";

  if (!webhookToken || webhookToken !== env.ASAAS_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Token de webhook inválido" },
      { status: 401 },
    );
  }

  let body: AsaasWebhookBody;
  try {
    body = (await request.json()) as AsaasWebhookBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.event || !EVENTS_TO_PROCESS.has(body.event)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const subscriptionId = body.subscription?.id ?? body.payment?.subscription;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Assinatura não encontrada no payload" },
      { status: 400 },
    );
  }

  try {
    const subscription = await fetchAsaasSubscription(
      subscriptionId,
      env.ASAAS_API_BASE,
      env.ASAAS_API_KEY,
    );
    const parsedRef = parseExternalReference(subscription.externalReference);
    const supabase = createAdminClient();

    let tenantId = parsedRef?.tenantId;
    if (!tenantId) {
      const { data: tenantBySub, error: tenantBySubError } = await supabase
        .from("tenants")
        .select("id")
        .eq("asaas_subscription_id", subscription.id)
        .maybeSingle();

      if (tenantBySubError) {
        console.error(
          "[WEBHOOK][ASAAS] Falha ao buscar tenant por assinatura:",
          tenantBySubError,
        );
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
      }

      tenantId = tenantBySub?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant não encontrado" },
        { status: 400 },
      );
    }

    const mappedStatus = mapAsaasStatus(subscription.status);
    const expiresAt = subscription.nextDueDate
      ? `${subscription.nextDueDate}T23:59:59.000Z`
      : null;

    const updatePayload: Record<string, unknown> = {
      subscription_status: mappedStatus,
      asaas_subscription_id: subscription.id,
      asaas_customer_id: subscription.customer,
      subscription_expires_at: expiresAt,
    };

    // Persist billing method so the renewal banner logic can check if
    // credit card subscribers have automatic debit (no banner needed).
    if (subscription.billingType) {
      const validMethods = ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"];
      const method = subscription.billingType.toUpperCase();
      if (validMethods.includes(method)) {
        updatePayload.subscription_billing_method = method;
      }
    }

    if (parsedRef) {
      updatePayload.billing_tier = parsedRef.tier;
      updatePayload.max_patients_allowed = parsedRef.maxPatients;
    }

    const { error } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenantId);

    if (error) {
      console.error("[WEBHOOK][ASAAS] Falha ao atualizar tenant:", error);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    const paymentId = body.payment?.id ?? null;
    if (
      paymentId &&
      (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED")
    ) {
      const { data: redemptionData, error: redemptionError } = await supabase
        .from("coupon_redemptions")
        .select(
          "id, coupon_id, tenant_id, user_id, redeemed_by_email, status, discounted_cycles_total, discounted_cycles_remaining, billing_period, original_amount, discounted_amount, asaas_subscription_id, linked_at, last_billing_event_at, last_processed_payment_id, created_at, updated_at",
        )
        .eq("asaas_subscription_id", subscription.id)
        .in("status", ["linked", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (redemptionError) {
        console.error(
          "[WEBHOOK][ASAAS] Falha ao buscar resgate de cupom:",
          redemptionError,
        );
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
      }

      if (redemptionData) {
        const redemption = redemptionData as CouponRedemptionRow;

        if (
          redemption.last_processed_payment_id !== paymentId &&
          redemption.discounted_cycles_remaining > 0
        ) {
          const nextRemaining = redemption.discounted_cycles_remaining - 1;
          const nextStatus = nextRemaining > 0 ? "active" : "completed";

          if (nextRemaining === 0 && redemption.original_amount) {
            await updateAsaasSubscriptionAmount({
              subscriptionId: subscription.id,
              value: Number(redemption.original_amount),
              apiBase: env.ASAAS_API_BASE,
              apiKey: env.ASAAS_API_KEY,
            });
          }

          const { error: redemptionUpdateError } = await supabase
            .from("coupon_redemptions")
            .update({
              discounted_cycles_remaining: nextRemaining,
              status: nextStatus,
              last_billing_event_at: new Date().toISOString(),
              last_processed_payment_id: paymentId,
            })
            .eq("id", redemption.id);

          if (redemptionUpdateError) {
            console.error(
              "[WEBHOOK][ASAAS] Falha ao atualizar resgate de cupom:",
              redemptionUpdateError,
            );
            return NextResponse.json(
              { error: "Erro interno" },
              { status: 500 },
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("[WEBHOOK][ASAAS] Erro ao processar evento:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
