import { NextRequest, NextResponse } from "next/server";

import type { CouponRedemptionRow } from "@/lib/coupons";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAsaasEnv } from "@/lib/env";
import { safeSecretEqual } from "@/lib/utils";

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
  value: number;
  nextDueDate?: string | null;
  billingType?: string | null;
};

type OverageRecord = {
  id: string;
  overage_patients: number;
  overage_slot_amount: number | null;
  asaas_base_amount: number | null;
  asaas_applied_at: string | null;
  asaas_reset_at: string | null;
};

async function claimAsaasWebhookPayment(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string,
  eventType: string,
) {
  const { data, error } = await supabase.rpc("claim_asaas_webhook_payment", {
    p_payment_id: paymentId,
    p_event_type: eventType,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function markAsaasWebhookPaymentProcessed(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string,
) {
  const { error } = await supabase.rpc("mark_asaas_webhook_payment_processed", {
    p_payment_id: paymentId,
  });

  if (error) {
    console.error(
      "[WEBHOOK][ASAAS] Falha ao marcar webhook como processado:",
      error,
    );
  }
}

async function markAsaasWebhookPaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string,
  errorMessage: string,
) {
  const { error } = await supabase.rpc("mark_asaas_webhook_payment_failed", {
    p_payment_id: paymentId,
    p_error_message: errorMessage,
  });

  if (error) {
    console.error(
      "[WEBHOOK][ASAAS] Falha ao marcar webhook como falho:",
      error,
    );
  }
}

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
  const [tenantId, tier, maxStr, periodRaw] = reference.split("|");
  const maxPatients = Number.parseInt(maxStr, 10);
  if (!tenantId || !tier || Number.isNaN(maxPatients)) return null;
  const period =
    periodRaw === "monthly" || periodRaw === "annual" ? periodRaw : null;
  return { tenantId, tier, maxPatients, period };
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

// Tolerance in BRL for floating-point subscription value comparisons
const AMOUNT_TOLERANCE = 0.02;

/**
 * Handles overage billing on each PAYMENT_RECEIVED event.
 *
 * Two-phase state machine per overage record:
 *   1. RESET  — if a previous period's bump is live (applied_at set, reset_at null),
 *               revert the Asaas subscription to asaas_base_amount.
 *   2. APPLY  — if last complete calendar month has overage_patients > 0 and hasn't
 *               been applied yet, bump the subscription for the next cycle.
 *
 * Anti-corruption guarantees:
 *   • asaas_base_amount is written to DB _before_ the Asaas API call so that if
 *     the API succeeds but the DB update for applied_at fails, the next webhook
 *     can detect the partial state and recover without double-charging.
 *   • Recovery: when asaas_base_amount IS NOT NULL but applied_at IS NULL, compare
 *     the live Asaas value against base + overage; if they match, the bump already
 *     happened — just mark applied_at without another API call.
 *   • Same recovery pattern for the reset phase.
 *   • currentValue is tracked locally after each mutation to avoid an extra
 *     Asaas GET between the reset and apply phases.
 */
async function processOverageBilling(input: {
  tenantId: string;
  subscriptionId: string;
  currentSubscriptionValue: number;
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
  apiBase: string;
  apiKey: string;
}) {
  const { tenantId, subscriptionId, supabase, apiBase, apiKey } = input;

  let currentValue = input.currentSubscriptionValue;
  const now = new Date();

  // ─── Phase 1: RESET ────────────────────────────────────────────────────────
  // Find the most recent period where the bump was applied but not yet reset.
  const { data: toReset, error: resetFetchError } = await supabase
    .from("patient_overage_usage_monthly")
    .select(
      "id, overage_patients, overage_slot_amount, asaas_base_amount, asaas_applied_at, asaas_reset_at",
    )
    .eq("tenant_id", tenantId)
    .not("asaas_applied_at", "is", null)
    .is("asaas_reset_at", null)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resetFetchError) {
    throw new Error(
      `[WEBHOOK][OVERAGE] Falha ao buscar registro para reset: ${resetFetchError.message}`,
    );
  } else if (toReset && toReset.asaas_base_amount !== null) {
    const rec = toReset as OverageRecord;
    const baseAmount = Number(rec.asaas_base_amount);
    const overageAmount =
      Number(rec.overage_patients) * Number(rec.overage_slot_amount ?? 0);
    const expectedBumped = baseAmount + overageAmount;

    // Recovery check: if Asaas already shows the base value, the reset happened
    // but the DB update failed on a previous attempt — just record it.
    const alreadyReset = Math.abs(currentValue - baseAmount) < AMOUNT_TOLERANCE;
    const stillBumped =
      Math.abs(currentValue - expectedBumped) < AMOUNT_TOLERANCE;

    if (stillBumped && !alreadyReset) {
      try {
        await updateAsaasSubscriptionAmount({
          subscriptionId,
          value: baseAmount,
          apiBase,
          apiKey,
        });
        currentValue = baseAmount;
      } catch (err) {
        console.error(
          "[WEBHOOK][OVERAGE] Falha ao resetar assinatura Asaas:",
          err,
        );
        throw err instanceof Error
          ? err
          : new Error("Falha ao resetar assinatura Asaas");
      }
    } else {
      // Already at base value (recovery case) — sync currentValue.
      currentValue = baseAmount;
    }

    const { error: resetMarkError } = await supabase
      .from("patient_overage_usage_monthly")
      .update({ asaas_reset_at: now.toISOString() })
      .eq("id", rec.id);

    if (resetMarkError) {
      throw new Error(
        `[WEBHOOK][OVERAGE] Falha ao gravar asaas_reset_at: ${resetMarkError.message}`,
      );
    }
  }

  // ─── Phase 2: APPLY ────────────────────────────────────────────────────────
  // Look for the previous complete calendar month's overage (charged in arrears).
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const prevMonthStartStr = prevMonthStart.toISOString().slice(0, 10);

  const { data: toApply, error: applyFetchError } = await supabase
    .from("patient_overage_usage_monthly")
    .select(
      "id, overage_patients, overage_slot_amount, asaas_base_amount, asaas_applied_at, asaas_reset_at",
    )
    .eq("tenant_id", tenantId)
    .eq("billing_period_start", prevMonthStartStr)
    .gt("overage_patients", 0)
    .is("asaas_applied_at", null)
    .maybeSingle();

  if (applyFetchError) {
    throw new Error(
      `[WEBHOOK][OVERAGE] Falha ao buscar registro para apply: ${applyFetchError.message}`,
    );
  }

  if (!toApply || !toApply.overage_slot_amount) {
    return; // No overage to charge this cycle.
  }

  const applyRec = toApply as OverageRecord;
  const overageAmount =
    Number(applyRec.overage_patients) * Number(applyRec.overage_slot_amount);

  // Recovery check: if asaas_base_amount is set from a previous partial attempt,
  // compare the live Asaas value to detect whether the bump already happened.
  if (applyRec.asaas_base_amount !== null) {
    const storedBase = Number(applyRec.asaas_base_amount);
    const expectedBumped = storedBase + overageAmount;

    if (Math.abs(currentValue - expectedBumped) < AMOUNT_TOLERANCE) {
      // Already bumped — just record applied_at and exit.
      const { error: appliedAtError } = await supabase
        .from("patient_overage_usage_monthly")
        .update({ asaas_applied_at: now.toISOString() })
        .eq("id", applyRec.id);

      if (appliedAtError) {
        throw new Error(
          `[WEBHOOK][OVERAGE] Falha ao gravar asaas_applied_at: ${appliedAtError.message}`,
        );
      }
      return;
    }
    // Asaas call failed on previous attempt — fall through to retry with currentValue as new base.
  }

  // Step A: write base_amount to DB BEFORE calling Asaas.
  // If Asaas succeeds but the Step B update fails, the next webhook
  // will use this stored value for recovery detection.
  const { error: baseWriteError } = await supabase
    .from("patient_overage_usage_monthly")
    .update({ asaas_base_amount: currentValue })
    .eq("id", applyRec.id);

  if (baseWriteError) {
    throw new Error(
      `[WEBHOOK][OVERAGE] Falha ao gravar asaas_base_amount: ${baseWriteError.message}`,
    );
  }

  // Step B: bump the Asaas subscription value.
  try {
    await updateAsaasSubscriptionAmount({
      subscriptionId,
      value: currentValue + overageAmount,
      apiBase,
      apiKey,
    });
  } catch (err) {
    console.error(
      "[WEBHOOK][OVERAGE] Falha ao aplicar bump de excedente no Asaas:",
      err,
    );
    throw err instanceof Error
      ? err
      : new Error("Falha ao aplicar bump de excedente no Asaas");
  }

  // Step C: confirm in DB that the bump is live.
  const { error: applyMarkError } = await supabase
    .from("patient_overage_usage_monthly")
    .update({ asaas_applied_at: now.toISOString() })
    .eq("id", applyRec.id);

  if (applyMarkError) {
    throw new Error(
      `[WEBHOOK][OVERAGE] Falha ao gravar asaas_applied_at: ${applyMarkError.message}`,
    );
  }
}

export async function POST(request: NextRequest) {
  const env = getAsaasEnv();
  const webhookToken =
    request.headers.get("asaas-access-token") ??
    request.headers.get("x-asaas-access-token") ??
    "";

  if (
    !webhookToken ||
    !safeSecretEqual(webhookToken, env.ASAAS_WEBHOOK_SECRET)
  ) {
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

  const paymentId = body.payment?.id ?? null;
  const supabase = createAdminClient();

  try {
    if (
      paymentId &&
      (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED")
    ) {
      const claimed = await claimAsaasWebhookPayment(
        supabase,
        paymentId,
        body.event,
      );

      if (!claimed) {
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    const subscription = await fetchAsaasSubscription(
      subscriptionId,
      env.ASAAS_API_BASE,
      env.ASAAS_API_KEY,
    );
    const parsedRef = parseExternalReference(subscription.externalReference);

    let tenantId = parsedRef?.tenantId;
    if (!tenantId) {
      const { data: tenantBySub, error: tenantBySubError } = await supabase
        .from("tenants")
        .select("id")
        .eq("asaas_subscription_id", subscription.id)
        .maybeSingle();

      if (tenantBySubError) {
        throw tenantBySubError;
      }

      tenantId = tenantBySub?.id;
    }

    if (!tenantId) {
      throw new Error("Tenant não encontrado");
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
      if (parsedRef.period) {
        updatePayload.subscription_period = parsedRef.period;
      }
    }

    const { error } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenantId);

    if (error) {
      throw error;
    }

    if (
      paymentId &&
      (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED")
    ) {
      // Process overage billing: reset previous bump (if live) then apply last
      // month's overage to the subscription for the next cycle (charged in arrears).
      await processOverageBilling({
        tenantId,
        subscriptionId: subscription.id,
        currentSubscriptionValue: subscription.value,
        supabase,
        apiBase: env.ASAAS_API_BASE,
        apiKey: env.ASAAS_API_KEY,
      });

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
        throw redemptionError;
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
            throw redemptionUpdateError;
          }
        }
      }
    }

    if (paymentId) {
      await markAsaasWebhookPaymentProcessed(supabase, paymentId);
    }
  } catch (error) {
    if (paymentId) {
      await markAsaasWebhookPaymentFailed(
        supabase,
        paymentId,
        error instanceof Error ? error.message : "Erro ao processar webhook",
      );
    }

    console.error("[WEBHOOK][ASAAS] Erro ao processar evento:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
