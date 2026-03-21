import type { AppUser } from "@/lib/auth";
import { isValidBrazilTaxId, normalizeBrazilTaxId } from "@/lib/brazil-tax-id";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type UpdateAccountBillingProfileInput = {
  supabase: SupabaseServerClient;
  appUser: AppUser;
  fullName: string;
  email: string;
  billingDocument: string;
  requireBillingDocument?: boolean;
  userFields?: Record<string, unknown>;
  tenantFields?: Record<string, unknown>;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveBookingSlug(
  supabase: SupabaseServerClient,
  appUser: AppUser,
  fullName: string,
) {
  if (fullName === appUser.full_name) {
    return appUser.booking_slug;
  }

  const { data: generatedSlug, error } = await supabase.rpc(
    "generate_unique_professional_slug",
    {
      base_name: fullName,
      p_user_id: appUser.id,
    },
  );

  if (error) {
    throw new Error(`Falha ao gerar slug público: ${error.message}`);
  }

  if (typeof generatedSlug === "string" && generatedSlug.length > 0) {
    return generatedSlug;
  }

  return appUser.booking_slug;
}

export async function updateAccountBillingProfile(
  input: UpdateAccountBillingProfileInput,
) {
  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const billingDocument = normalizeBrazilTaxId(input.billingDocument);

  if (!fullName || !email) {
    throw new Error("Preencha nome e e-mail.");
  }

  if (!emailPattern.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  if (input.requireBillingDocument && !billingDocument) {
    throw new Error("Informe um CPF ou CNPJ para faturamento.");
  }

  if (billingDocument && !isValidBrazilTaxId(billingDocument)) {
    throw new Error("Informe um CPF ou CNPJ válido para faturamento.");
  }

  const bookingSlug = await resolveBookingSlug(
    input.supabase,
    input.appUser,
    fullName,
  );

  const { error: userError } = await input.supabase
    .from("users")
    .update({
      full_name: fullName,
      email,
      booking_slug: bookingSlug,
      ...(input.userFields ?? {}),
    })
    .eq("id", input.appUser.id)
    .eq("tenant_id", input.appUser.tenant_id);

  if (userError) {
    throw new Error(userError.message);
  }

  const { error: tenantError } = await input.supabase
    .from("tenants")
    .update({
      cpf_cnpj: billingDocument || null,
      ...(input.tenantFields ?? {}),
    })
    .eq("id", input.appUser.tenant_id);

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  const emailChanged = email !== input.appUser.email;
  if (emailChanged) {
    const { error: authError } = await input.supabase.auth.updateUser({ email });

    if (authError) {
      throw new Error(authError.message);
    }
  }

  return {
    bookingSlug,
    emailChanged,
    billingDocument,
  };
}