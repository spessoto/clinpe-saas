import Link from "next/link";

import {
  createPatientAction,
  getPatientCountStatus,
} from "@/app/(protected)/patients/actions";
import { OtherReasonInput } from "@/app/(protected)/patients/new/other-reason-input";
import { requireActiveTenant } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPatientPage({ searchParams }: Props) {
  const { tenant } = await requireActiveTenant();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const isLimitReached = params.limitReached === "true";

  const limitStatus = await getPatientCountStatus();

  if (isLimitReached) {
    return (
      <section className="surface-card max-w-xl p-6">
        <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6 text-center">
          <h2 className="text-2xl font-bold text-destructive">
            Limite de Pacientes Atingido
          </h2>
          <p className="mt-3 text-sm text-destructive/80">
            Você atingiu o limite de{" "}
            <strong>{tenant.max_patients_allowed} pacientes</strong> para seu
            plano {tenant.billing_tier}.
          </p>

          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted">
              Pacientes atuais:{" "}
              <strong>
                {limitStatus.current}/{limitStatus.max}
              </strong>
            </p>

            <button
              onClick={() => (window.location.href = "/billing")}
              className="btn-gradient w-full"
            >
              Fazer Upgrade Now
            </button>

            <Link href="/patients" className="btn-outline-modern block">
              Voltar aos Pacientes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card mx-auto max-w-5xl p-6 md:p-8">
      <h2 className="text-2xl font-bold">Novo paciente</h2>
      <p className="mt-1 text-sm text-muted">
        Cadastre o paciente para iniciar o histórico clínico.
      </p>

      {limitStatus.remainingSlots <= 3 && !isLimitReached ? (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
          <p className="text-xs font-semibold text-warning">
            ⚠️ Você tem apenas {limitStatus.remainingSlots} slot
            {limitStatus.remainingSlots !== 1 ? "s" : ""} de paciente
            {limitStatus.remainingSlots !== 1 ? "s" : ""} restante
            {limitStatus.remainingSlots !== 1 ? "s" : ""}.
          </p>
          <Link
            href="/billing"
            className="mt-2 inline-text-sm font-semibold text-warning hover:underline"
          >
            Fazer upgrade →
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createPatientAction} className="mt-6 space-y-8 pb-24">
        {/* Identificação */}
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-foreground">
            Identificação
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Nome completo *</span>
            <input
              name="name"
              required
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
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">CPF</span>
              <input
                name="cpf"
                placeholder="000.000.000-00"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">RG</span>
              <input
                name="rg"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </fieldset>

        {/* Contato e Localização */}
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-foreground">
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
                placeholder="(11) 99999-9999"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">E-mail</span>
              <input
                type="email"
                name="email"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-foreground">Logradouro</span>
              <input
                name="address_street"
                placeholder="Rua, número, complemento"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">Bairro</span>
              <input
                name="address_neighborhood"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-foreground">CEP</span>
              <input
                name="address_zipcode"
                placeholder="00000-000"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>
        </fieldset>

        {/* Perfil Social */}
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-foreground">
            Perfil Social e Segurança
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Profissão / Ocupação
            </span>
            <input
              name="occupation"
              placeholder="Ex: Construção civil, Bancário, Nadador..."
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
            Esses dados alimentam os alertas visuais em todo o sistema e são
            reconfirmados a cada consulta.
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
            />
          </div>

          {/* Hábitos base */}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="checkbox"
                name="is_smoker"
                value="true"
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
            />
          </div>
        </fieldset>

        {/* Origem (Marketing) */}
        <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-foreground">
            Origem
          </legend>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Como nos conheceu?
            </span>
            <select
              id="referral_source"
              name="referral_source"
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
              <option value="Outro">Outros</option>
            </select>
          </label>
          <OtherReasonInput
            triggerSelector="#referral_source"
            inputName="referral_source_other_reason"
            label="Motivo de Outros (origem)"
            placeholder="Descreva como conheceu a clínica"
          />
        </fieldset>

        <div className="flex gap-2">
          <button type="submit" className="btn-gradient">
            Salvar
          </button>
          <Link href="/patients" className="btn-outline-modern">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
