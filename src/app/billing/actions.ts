"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth";
import { getAsaasEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { BILLING_PLANS, type BillingPeriod, type BillingTier } from "./plans";

type AsaasBillingType = "UNDEFINED" | "BOLETO" | "CREDIT_CARD" | "PIX";

type AsaasCustomerResponse = {
  id: string;
};

type AsaasSubscriptionResponse = {
  id: string;
};

type AsaasPayment = {
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

async function asaasRequest<T>(
  endpoint: string,
  init: RequestInit,
  apiBase: string,
  apiKey: string,
): Promise<T> {
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...init,
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Asaas retornou erro (${response.status}): ${text || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function createCheckoutAction(formData: FormData) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();
  const env = getAsaasEnv();

  const tier = formData.get("tier") as BillingTier;
  const period = formData.get("period") as BillingPeriod;

  const plan = BILLING_PLANS[tier];
  if (!plan || !["monthly", "annual"].includes(period)) {
    redirect("/billing?error=Plano+inválido+selecionado");
  }

  const pricing = plan[period];

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, asaas_customer_id")
    .eq("id", appUser.tenant_id)
    .single();

  if (tenantError || !tenant) {
    redirect(
      `/billing?error=${encodeURIComponent("Erro ao carregar tenant para checkout")}`,
    );
  }

  const billingType = (formData.get("billing_method") ||
    "UNDEFINED") as AsaasBillingType;
  const externalReference = `${appUser.tenant_id}|${tier}|${plan.maxPatients}|${period}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  let customerId = tenant?.asaas_customer_id ?? null;

  try {
    if (!customerId) {
      const customer = await asaasRequest<AsaasCustomerResponse>(
        "/customers",
        {
          method: "POST",
          body: JSON.stringify({
            name: appUser.full_name,
            email: appUser.email,
            externalReference: appUser.tenant_id,
          }),
        },
        env.ASAAS_API_BASE,
        env.ASAAS_API_KEY,
      );
      customerId = customer.id;

      if (!customerId) {
        throw new Error("Asaas não retornou customer.id");
      }
    }

    const subscription = await asaasRequest<AsaasSubscriptionResponse>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: pricing.amount,
          nextDueDate: toDateOnly(dueDate),
          cycle: period === "annual" ? "YEARLY" : "MONTHLY",
          description: pricing.description,
          externalReference,
        }),
      },
      env.ASAAS_API_BASE,
      env.ASAAS_API_KEY,
    );

    if (!subscription.id) {
      throw new Error("Asaas não retornou subscription.id");
    }

    const payments = await asaasRequest<{ data: AsaasPayment[] }>(
      `/subscriptions/${subscription.id}/payments?limit=1&offset=0`,
      { method: "GET" },
      env.ASAAS_API_BASE,
      env.ASAAS_API_KEY,
    );

    const { error: tenantUpdateError } = await supabase
      .from("tenants")
      .update({
        asaas_customer_id: customerId,
        asaas_subscription_id: subscription.id,
      })
      .eq("id", appUser.tenant_id);

    if (tenantUpdateError) {
      throw new Error(
        `Falha ao persistir assinatura no tenant: ${tenantUpdateError.message}`,
      );
    }

    const firstPayment = payments.data?.[0];
    const paymentUrl = firstPayment?.invoiceUrl || firstPayment?.bankSlipUrl;

    if (paymentUrl) {
      redirect(paymentUrl);
    }

    redirect("/billing?status=success");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao contatar Asaas";
    console.error("[billing] createCheckoutAction falhou:", message);
    redirect(
      `/billing?error=${encodeURIComponent("Erro ao conectar com Asaas: " + message)}`,
    );
  }
}
