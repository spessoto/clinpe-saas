"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth";
import { updateAccountBillingProfile } from "@/lib/account-billing-profile";
import { isValidBrazilTaxId, normalizeBrazilTaxId } from "@/lib/brazil-tax-id";
import {
  applyCouponDiscount,
  couponSupportsPeriod,
  type CouponRedemptionRow,
  type CouponRow,
} from "@/lib/coupons";
import { getAsaasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type BillingPeriod, type BillingTier } from "./plans";
import { getBillingPlans } from "./plans-server";

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

type CouponCheckoutData = {
  redemptionId: string;
  code: string;
  discountedAmount: number;
  originalAmount: number;
  discountedCyclesRemaining: number;
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

async function upsertAsaasCustomer(input: {
  customerId: string | null;
  name: string;
  email: string;
  cpfCnpj: string;
  externalReference: string;
  apiBase: string;
  apiKey: string;
}) {
  const payload = {
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj,
    externalReference: input.externalReference,
  };

  if (!input.customerId) {
    const customer = await asaasRequest<AsaasCustomerResponse>(
      "/customers",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      input.apiBase,
      input.apiKey,
    );

    if (!customer.id) {
      throw new Error("Asaas não retornou customer.id");
    }

    return customer.id;
  }

  const customer = await asaasRequest<AsaasCustomerResponse>(
    `/customers/${input.customerId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    input.apiBase,
    input.apiKey,
  );

  if (!customer.id) {
    throw new Error("Asaas não retornou customer.id ao atualizar cliente");
  }

  return customer.id;
}

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getReservedCouponCheckoutData(input: {
  tenantId: string;
  userId: string;
  period: BillingPeriod;
  originalAmount: number;
}) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("coupon_redemptions")
    .select(
      "id, coupon_id, tenant_id, user_id, redeemed_by_email, status, discounted_cycles_total, discounted_cycles_remaining, billing_period, original_amount, discounted_amount, asaas_subscription_id, linked_at, last_billing_event_at, last_processed_payment_id, created_at, updated_at, coupon:coupons(id, code, description, discount_type, discount_value, discounted_cycles, valid_from, valid_until, max_total_uses, times_redeemed, applies_to_period, is_active, updated_by_email, created_at, updated_at)",
    )
    .eq("tenant_id", input.tenantId)
    .eq("user_id", input.userId)
    .eq("status", "reserved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const redemption = data as CouponRedemptionRow & { coupon: CouponRow | null };
  if (!redemption.coupon || redemption.discounted_cycles_remaining <= 0) {
    return null;
  }

  if (!couponSupportsPeriod(redemption.coupon, input.period)) {
    return null;
  }

  return {
    redemptionId: redemption.id,
    code: redemption.coupon.code,
    discountedAmount: applyCouponDiscount(
      input.originalAmount,
      redemption.coupon,
    ),
    originalAmount: input.originalAmount,
    discountedCyclesRemaining: redemption.discounted_cycles_remaining,
  } satisfies CouponCheckoutData;
}

async function linkCouponToSubscription(input: {
  redemptionId: string;
  subscriptionId: string;
  period: BillingPeriod;
  originalAmount: number;
  discountedAmount: number;
}) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("coupon_redemptions")
    .update({
      status: "linked",
      asaas_subscription_id: input.subscriptionId,
      billing_period: input.period,
      original_amount: input.originalAmount,
      discounted_amount: input.discountedAmount,
      linked_at: new Date().toISOString(),
    })
    .eq("id", input.redemptionId);

  if (error) {
    throw new Error(`Falha ao vincular cupom à assinatura: ${error.message}`);
  }
}

async function createSubscriptionCheckout(input: {
  appUser: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  tenant: {
    id: string;
    asaas_customer_id: string | null;
    cpf_cnpj: string | null;
  };
  tier: BillingTier;
  period: BillingPeriod;
  maxPatients: number;
  pricing: { amount: number; description: string };
  billingType: AsaasBillingType;
  billingDocument: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const env = getAsaasEnv();
  const externalReference = `${input.appUser.tenant_id}|${input.tier}|${input.maxPatients}|${input.period}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const couponCheckout = await getReservedCouponCheckoutData({
    tenantId: input.appUser.tenant_id,
    userId: input.appUser.id,
    period: input.period,
    originalAmount: input.pricing.amount,
  });

  let customerId = input.tenant.asaas_customer_id ?? null;

  customerId = await upsertAsaasCustomer({
    customerId,
    name: input.appUser.full_name,
    email: input.appUser.email,
    cpfCnpj: input.billingDocument,
    externalReference: input.appUser.tenant_id,
    apiBase: env.ASAAS_API_BASE,
    apiKey: env.ASAAS_API_KEY,
  });

  const finalAmount = couponCheckout?.discountedAmount ?? input.pricing.amount;
  const description = couponCheckout
    ? `${input.pricing.description} | Cupom ${couponCheckout.code}`
    : input.pricing.description;

  const subscription = await asaasRequest<AsaasSubscriptionResponse>(
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: input.billingType,
        value: finalAmount,
        nextDueDate: toDateOnly(dueDate),
        cycle: input.period === "annual" ? "YEARLY" : "MONTHLY",
        description,
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

  const { error: tenantUpdateError } = await input.supabase
    .from("tenants")
    .update({
      asaas_customer_id: customerId,
      asaas_subscription_id: subscription.id,
      subscription_billing_method: input.billingType,
    })
    .eq("id", input.appUser.tenant_id);

  if (tenantUpdateError) {
    throw new Error(
      `Falha ao persistir assinatura no tenant: ${tenantUpdateError.message}`,
    );
  }

  if (couponCheckout) {
    await linkCouponToSubscription({
      redemptionId: couponCheckout.redemptionId,
      subscriptionId: subscription.id,
      period: input.period,
      originalAmount: couponCheckout.originalAmount,
      discountedAmount: couponCheckout.discountedAmount,
    });
  }

  return payments;
}

export async function saveBillingProfileAction(formData: FormData) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();

  try {
    const { emailChanged } = await updateAccountBillingProfile({
      supabase,
      appUser,
      fullName: getField(formData, "full_name"),
      email: getField(formData, "email"),
      billingDocument: getField(formData, "cpf_cnpj"),
      requireBillingDocument: true,
    });

    redirect(
      `/billing?status=${emailChanged ? "billing-profile-email-updated" : "billing-profile-saved"}`,
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof Error
        ? error.message
        : "Falha ao salvar dados de faturamento.";

    redirect(`/billing?error=${encodeURIComponent(message)}`);
  }
}

export async function createCheckoutAction(formData: FormData) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();

  const tier = formData.get("tier") as BillingTier;
  const period = formData.get("period") as BillingPeriod;
  const billingPlans = await getBillingPlans();

  const plan = billingPlans[tier];
  if (!plan || !["monthly", "annual"].includes(period)) {
    redirect("/billing?error=Plano+inválido+selecionado");
  }

  const pricing = plan[period];

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, asaas_customer_id, cpf_cnpj")
    .eq("id", appUser.tenant_id)
    .single();

  if (tenantError || !tenant) {
    redirect(
      `/billing?error=${encodeURIComponent("Erro ao carregar tenant para checkout")}`,
    );
  }

  const billingType = (formData.get("billing_method") ||
    "UNDEFINED") as AsaasBillingType;
  const billingDocument = normalizeBrazilTaxId(tenant?.cpf_cnpj);

  if (!isValidBrazilTaxId(billingDocument)) {
    redirect(
      `/billing?error=${encodeURIComponent("Cadastre um CPF ou CNPJ válido em Configurações antes de assinar.")}`,
    );
  }

  try {
    const payments = await createSubscriptionCheckout({
      appUser,
      tenant,
      tier,
      period,
      maxPatients: plan.maxPatients,
      pricing,
      billingType,
      billingDocument,
      supabase,
    });

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

export async function continueBillingCheckout(formData: FormData) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();

  const tier = formData.get("tier") as BillingTier;
  const period = formData.get("period") as BillingPeriod;
  const billingPlans = await getBillingPlans();
  const cpfCnpj = getField(formData, "cpf_cnpj");
  const billingMethod = (formData.get("billing_method") ||
    "UNDEFINED") as AsaasBillingType;

  const plan = billingPlans[tier];
  if (!plan || !["monthly", "annual"].includes(period)) {
    redirect("/billing?error=Plano+inválido+selecionado");
  }

  const pricing = plan[period];

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, asaas_customer_id, cpf_cnpj")
    .eq("id", appUser.tenant_id)
    .single();

  if (tenantError || !tenant) {
    redirect(
      `/billing?error=${encodeURIComponent("Erro ao carregar tenant para checkout")}`,
    );
  }

  // Step 1: Validate and normalize CPF/CNPJ
  const normalizedCpfCnpj = normalizeBrazilTaxId(cpfCnpj);
  if (!isValidBrazilTaxId(normalizedCpfCnpj)) {
    redirect(
      `/billing?error=${encodeURIComponent("CPF ou CNPJ inválido. Verifique o formato e tente novamente.")}`,
    );
  }

  // Step 2: Save billing profile (validate + persist CPF/CNPJ)
  try {
    await updateAccountBillingProfile({
      supabase,
      appUser,
      fullName: appUser.full_name, // Keep existing name, don't allow edit in modal
      email: appUser.email, // Keep existing email, don't allow edit in modal
      billingDocument: normalizedCpfCnpj,
      requireBillingDocument: true,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Falha ao salvar dados de faturamento";
    redirect(`/billing?error=${encodeURIComponent(message)}`);
  }

  try {
    const payments = await createSubscriptionCheckout({
      appUser,
      tenant,
      tier,
      period,
      maxPatients: plan.maxPatients,
      pricing,
      billingType: billingMethod,
      billingDocument: normalizedCpfCnpj,
      supabase,
    });

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
    console.error("[billing] continueBillingCheckout falhou:", message);
    redirect(
      `/billing?error=${encodeURIComponent("Erro ao processar assinatura: " + message)}`,
    );
  }
}
