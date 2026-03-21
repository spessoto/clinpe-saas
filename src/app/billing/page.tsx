import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, AlertCircle, Info, Mail } from "lucide-react";

import { isConfiguredAdminEmail, requireAuthenticatedUser } from "@/lib/auth";
import { couponSupportsPeriod, formatCouponValue } from "@/lib/coupons";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TenantBillingStatus } from "@/lib/tenant-access";
import { getEffectiveTrialEnd } from "@/lib/tenant-access";
import { type BillingPeriod } from "./plans";
import { getBillingPlans } from "./plans-server";
import { PeriodToggle } from "./period-toggle";
import { BillingPlansGrid } from "./billing-plans-grid";

type SearchParams = Promise<{
  period?: string;
  status?: string;
  error?: string;
}>;

function statusFeedback(status: string | undefined) {
  if (status === "success") {
    return {
      tone: "success" as const,
      title: "Pagamento recebido!",
      description:
        "Sua assinatura está sendo processada. Em instantes seu acesso será liberado — recarregue a página se necessário.",
    };
  }

  if (status === "billing-profile-saved") {
    return {
      tone: "success" as const,
      title: "Dados de faturamento salvos",
      description:
        "Agora você já pode seguir com a assinatura do plano desejado.",
    };
  }

  if (status === "billing-profile-email-updated") {
    return {
      tone: "success" as const,
      title: "Dados salvos e e-mail atualizado",
      description:
        "Confirme o novo e-mail na sua caixa de entrada e depois continue com a assinatura.",
    };
  }

  return null;
}

function getTrialStatus(tenant: {
  trial_ends_at: string;
  trial_extension_days: number;
  is_permanent_free_plan: boolean;
  subscription_status: TenantBillingStatus;
}) {
  if (tenant.is_permanent_free_plan) {
    return { type: "free_permanent" as const };
  }

  if (tenant.subscription_status === "active") {
    return { type: "active" as const };
  }

  const trialEnd = getEffectiveTrialEnd(tenant);
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { type: "expired" as const, daysLeft: 0 };
  return { type: "trial" as const, daysLeft };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const appUser = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "trial_ends_at, trial_extension_days, is_permanent_free_plan, subscription_status, billing_tier, cpf_cnpj",
    )
    .eq("id", appUser.tenant_id)
    .single();

  const adminClient = createAdminClient();
  const { data: couponRedemption } = await adminClient
    .from("coupon_redemptions")
    .select(
      "discounted_cycles_remaining, discounted_cycles_total, status, coupon:coupons(code, discount_type, discount_value, applies_to_period)",
    )
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .in("status", ["reserved", "linked", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const params = await searchParams;
  const period: BillingPeriod =
    params.period === "annual" ? "annual" : "monthly";
  const statusParam = params.status;
  const errorParam = params.error;
  const canAccessAdmin = isConfiguredAdminEmail(appUser.email);
  const feedback = statusFeedback(statusParam);
  const plans = await getBillingPlans();
  const couponRelation = couponRedemption
    ? Array.isArray(couponRedemption.coupon)
      ? (couponRedemption.coupon[0] ?? null)
      : couponRedemption.coupon
    : null;
  const couponPreview = couponRedemption
    ? {
        code: couponRelation?.code ?? "",
        discount_type: couponRelation?.discount_type ?? "percentage",
        discount_value: Number(couponRelation?.discount_value ?? 0),
        applies_to_period: couponRelation?.applies_to_period ?? "both",
        discounted_cycles_remaining:
          couponRedemption.discounted_cycles_remaining ?? 0,
        discounted_cycles_total: couponRedemption.discounted_cycles_total ?? 0,
      }
    : null;

  const trialStatus = tenant
    ? getTrialStatus(tenant)
    : { type: "expired" as const, daysLeft: 0 };
  const resolvedTenant = tenant ?? {
    trial_ends_at: new Date(0).toISOString(),
    trial_extension_days: 0,
    is_permanent_free_plan: false,
    subscription_status: "past_due" as const,
    billing_tier: null,
    cpf_cnpj: null,
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/logo-pododesk.png"
            alt="PodoDesk"
            width={180}
            height={60}
            priority
            className="h-auto w-44"
          />
        </div>

        {/* Status feedback */}
        {feedback && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold text-success">{feedback.title}</p>
              <p className="mt-0.5 text-sm text-muted">
                {feedback.description}
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
        {couponPreview?.code ? (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-primary">
                Cupom {couponPreview.code} vinculado à sua conta
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Desconto de {formatCouponValue(couponPreview)} por até{" "}
                {couponPreview.discounted_cycles_total} ciclo(s)
                {couponSupportsPeriod(couponPreview, period)
                  ? ` neste período ${period === "annual" ? "anual" : "mensal"}.`
                  : `. Este cupom só vale para o período ${couponPreview.applies_to_period}.`}
              </p>
            </div>
          </div>
        ) : null}

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
          {trialStatus.type === "free_permanent" && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle className="size-3.5" />
              Plano Free Permanente ativo
            </span>
          )}
          <h1 className="text-3xl font-bold text-foreground">
            {trialStatus.type === "expired"
              ? "Ative sua assinatura para continuar"
              : "Escolha seu plano"}
          </h1>
          <p className="mt-2 text-muted">
            {trialStatus.type === "expired"
              ? "Seu período gratuito terminou. Selecione um plano para voltar a usar o PodoDesk."
              : trialStatus.type === "free_permanent"
                ? "Seu tenant está operando em free permanente. Você ainda pode migrar para um plano pago a qualquer momento."
                : "Acesso completo a prontuários, agenda e agendamento online."}
          </p>
          {canAccessAdmin ? (
            <div className="mt-4 flex justify-center">
              <Link href="/admin" className="btn-outline-modern">
                Abrir painel admin
              </Link>
            </div>
          ) : null}
        </div>

        {/* Period toggle */}
        <div className="mb-10 flex justify-center">
          <Suspense>
            <PeriodToggle period={period} />
          </Suspense>
        </div>

        {/* Plan cards grid with modal */}
        <BillingPlansGrid
          appUser={appUser}
          tenant={resolvedTenant}
          couponPreview={couponPreview}
          period={period}
          trialStatus={trialStatus}
          plans={plans}
        />

        {/* Enterprise CTA */}
        <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-surface p-5 text-center">
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">
              Mais de 200 pacientes?
            </span>{" "}
            Entre em contato para um plano personalizado.
          </p>
          <a
            href="mailto:contato@pododesk.com.br"
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
