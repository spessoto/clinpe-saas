import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePatientAction } from "@/app/(protected)/patients/actions";
import { OtherReasonInput } from "@/app/(protected)/patients/new/other-reason-input";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function hasOtherSelectedInArray(values: unknown, baseLabel: string) {
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some(
    (value) =>
      value === baseLabel ||
      (typeof value === "string" && value.startsWith(`${baseLabel}:`)),
  );
}

function extractOtherReasonInArray(values: unknown, baseLabel: string) {
  if (!Array.isArray(values)) {
    return "";
  }

  const found = values.find(
    (value) => typeof value === "string" && value.startsWith(`${baseLabel}:`),
  );

  if (!found || typeof found !== "string") {
    return "";
  }

  return found.replace(`${baseLabel}:`, "").trim();
}

function isOtherSelectedInSingle(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  return value === "Outro" || value.startsWith("Outro:");
}

function extractOtherReasonInSingle(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  if (!value.startsWith("Outro:")) {
    return "";
  }

  return value.replace("Outro:", "").trim();
}

export default async function EditPatientPage({ params, searchParams }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;
  const paramsSearch = await searchParams;
  const error =
    typeof paramsSearch.error === "string" ? paramsSearch.error : null;

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    redirect(
      `/patients?error=${encodeURIComponent("Paciente não encontrado para edição neste usuário.")}`,
    );
  }

  const continuousMeds = Array.isArray(patient.continuous_meds)
    ? patient.continuous_meds
    : [];
  const patientAllergies = Array.isArray(patient.patient_allergies)
    ? patient.patient_allergies
    : [];

  const hasContinuousMedsOther = hasOtherSelectedInArray(
    continuousMeds,
    "Outro",
  );
  const hasAllergiesOther = hasOtherSelectedInArray(patientAllergies, "Outra");
  const continuousMedsOtherReason = extractOtherReasonInArray(
    continuousMeds,
    "Outro",
  );
  const patientAllergiesOtherReason = extractOtherReasonInArray(
    patientAllergies,
    "Outra",
  );

  const predominantFootwearRaw =
    typeof patient.predominant_footwear === "string"
      ? patient.predominant_footwear
      : "";
  const referralSourceRaw =
    typeof patient.referral_source === "string" ? patient.referral_source : "";

  const predominantFootwearValue = isOtherSelectedInSingle(
    predominantFootwearRaw,
  )
    ? "Outro"
    : predominantFootwearRaw;
  const referralSourceValue = isOtherSelectedInSingle(referralSourceRaw)
    ? "Outro"
    : referralSourceRaw;

  const predominantFootwearOtherReason = extractOtherReasonInSingle(
    predominantFootwearRaw,
  );
  const referralSourceOtherReason =
    extractOtherReasonInSingle(referralSourceRaw);

  return (
    <section className="surface-card max-w-xl p-6">
      <h2 className="text-2xl font-bold">Editar paciente</h2>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={updatePatientAction} className="mt-6 space-y-8">
        <input type="hidden" name="id" value={patient.id} />

        {/* Identificação */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-foreground">
            Identificação
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Nome completo *</span>
            <input
              name="name"
              required
              defaultValue={patient.name}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Data de nascimento
              </span>
              <input
                type="date"
                name="birth_date"
                defaultValue={patient.birth_date ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">CPF</span>
              <input
                name="cpf"
                placeholder="000.000.000-00"
                defaultValue={patient.cpf ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">RG</span>
              <input
                name="rg"
                defaultValue={patient.rg ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </fieldset>

        {/* Contato e Localização */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-foreground">
            Contato e Localização
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                WhatsApp / Telefone *
              </span>
              <input
                name="phone"
                required
                defaultValue={patient.phone}
                placeholder="(11) 99999-9999"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">E-mail</span>
              <input
                type="email"
                name="email"
                defaultValue={patient.email ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-foreground">Logradouro</span>
              <input
                name="address_street"
                placeholder="Rua, número, complemento"
                defaultValue={patient.address_street ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Bairro</span>
              <input
                name="address_neighborhood"
                defaultValue={patient.address_neighborhood ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">CEP</span>
              <input
                name="address_zipcode"
                placeholder="00000-000"
                defaultValue={patient.address_zipcode ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </fieldset>

        {/* Perfil Social */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-foreground">
            Perfil Social e Segurança
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Profissão / Ocupação
            </span>
            <input
              name="occupation"
              placeholder="Ex: Construção civil, Bancário, Nadador..."
              defaultValue={patient.occupation ?? ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Contato de emergência — nome
              </span>
              <input
                name="emergency_contact_name"
                defaultValue={patient.emergency_contact_name ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Contato de emergência — telefone
              </span>
              <input
                name="emergency_contact_phone"
                placeholder="(11) 99999-9999"
                defaultValue={patient.emergency_contact_phone ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </fieldset>

        {/* Histórico de Saúde */}
        <fieldset className="space-y-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <legend className="px-2 text-base font-semibold text-destructive">
            Histórico de Saúde (estado atual)
          </legend>
          <p className="text-xs text-muted">
            Dados mestres do paciente. São pre-preenchidos na anamnese de cada
            consulta e podem ser corrigidos lá.
          </p>

          {/* Condições crônicas */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Condições sistêmicas
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["has_diabetes", "Diabetes"],
                  ["has_vascular_issues", "Vascular / Cardíaco"],
                  ["has_coagulation_disorders", "Distúrbio de Coagulação"],
                  ["has_oncological_history", "Histórico Oncológico"],
                ] as [string, string][]
              ).map(([name, label]) => (
                <label key={name} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={name}
                    value="true"
                    defaultChecked={!!patient[name as keyof typeof patient]}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-destructive/40 bg-white px-4 text-sm font-medium text-destructive/80 transition peer-checked:border-destructive peer-checked:bg-destructive peer-checked:text-white">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Detalhe diabetes */}
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
            <p className="text-xs font-semibold text-muted sm:col-span-3">
              Se Diabetes — detalhe:
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Tipo</span>
              <select
                name="diabetes_type"
                defaultValue={patient.diabetes_type ?? ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">—</option>
                <option value="1">Tipo 1</option>
                <option value="2">Tipo 2</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Usa insulina?</span>
              <select
                name="diabetes_on_insulin"
                defaultValue={
                  patient.diabetes_on_insulin === true
                    ? "true"
                    : patient.diabetes_on_insulin === false
                      ? "false"
                      : ""
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">—</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
          </div>

          {/* Medicamentos */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Medicamentos de uso contínuo
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "AAS / Anticoagulante",
                "Imunossupressor",
                "Corticoide",
                "Outro",
              ].map((med) => (
                <label key={med} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="continuous_meds"
                    value={med}
                    defaultChecked={
                      med === "Outro"
                        ? hasContinuousMedsOther
                        : continuousMeds.includes(med)
                    }
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-amber-400/60 bg-white px-4 text-sm font-medium text-amber-700 transition peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-checked:text-white">
                    {med}
                  </span>
                </label>
              ))}
            </div>
            <OtherReasonInput
              triggerSelector="input[name='continuous_meds'][value='Outro']"
              inputName="continuous_meds_other_reason"
              label="Motivo de Outros (medicamentos)"
              placeholder="Descreva o medicamento de uso contínuo"
              defaultValue={continuousMedsOtherReason}
            />
          </div>

          {/* Alergias */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Alergias conhecidas
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Iodo",
                "Látex (luvas)",
                "Anestésico tópico",
                "Cosméticos",
                "Outra",
              ].map((allergy) => (
                <label key={allergy} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="patient_allergies"
                    value={allergy}
                    defaultChecked={
                      allergy === "Outra"
                        ? hasAllergiesOther
                        : patientAllergies.includes(allergy)
                    }
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-orange-400/60 bg-white px-4 text-sm font-medium text-orange-700 transition peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white">
                    {allergy}
                  </span>
                </label>
              ))}
            </div>
            <OtherReasonInput
              triggerSelector="input[name='patient_allergies'][value='Outra']"
              inputName="patient_allergies_other_reason"
              label="Motivo de Outros (alergias)"
              placeholder="Descreva a alergia"
              defaultValue={patientAllergiesOtherReason}
            />
          </div>

          {/* Hábitos base */}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="checkbox"
                name="is_smoker"
                value="true"
                defaultChecked={patient.is_smoker ?? false}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-slate-700 peer-checked:bg-slate-700 peer-checked:text-white">
                🚬 Fumante
              </span>
            </label>
          </div>

          {/* Calçado */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Calçado predominante
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Salto alto",
                "Bico fino",
                "Sapatilha",
                "Bota EPI",
                "Tênis",
                "Chinelo",
                "Outro",
              ].map((shoe) => (
                <label key={shoe} className="cursor-pointer">
                  <input
                    type="radio"
                    name="predominant_footwear"
                    value={shoe}
                    defaultChecked={predominantFootwearValue === shoe}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    {shoe}
                  </span>
                </label>
              ))}
            </div>
            <OtherReasonInput
              triggerSelector="input[name='predominant_footwear'][value='Outro']"
              inputName="predominant_footwear_other_reason"
              label="Motivo de Outros (calçado)"
              placeholder="Descreva o calçado predominante"
              defaultValue={predominantFootwearOtherReason}
            />
          </div>
        </fieldset>

        {/* Origem */}
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-foreground">
            Origem
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Como nos conheceu?
            </span>
            <select
              name="referral_source"
              defaultValue={referralSourceValue}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            >
              <option value="">Não informado</option>
              <option value="Instagram">Instagram</option>
              <option value="Indicação">Indicação de paciente</option>
              <option value="Passou na frente">
                Passou na frente da clínica
              </option>
              <option value="Google">Pesquisa no Google</option>
              <option value="Facebook">Facebook</option>
              <option value="Outro">Outro</option>
            </select>
          </label>
          <OtherReasonInput
            triggerSelector="select[name='referral_source']"
            inputName="referral_source_other_reason"
            label="Motivo de Outros (origem)"
            placeholder="Descreva como o paciente conheceu a clínica"
            defaultValue={referralSourceOtherReason}
          />
        </fieldset>

        <div className="flex gap-2">
          <button type="submit" className="btn-gradient">
            Salvar alteracoes
          </button>
          <Link href={`/patients/${patient.id}`} className="btn-outline-modern">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
