import Link from "next/link";

import {
  createPatientAction,
  getPatientCountStatus,
} from "@/app/(protected)/patients/actions";
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
    <section className="surface-card max-w-xl p-6">
      <h2 className="text-2xl font-bold">Novo paciente</h2>
      <p className="mt-1 text-sm text-muted">
        Cadastre o paciente para iniciar o historico clinico.
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

      <form action={createPatientAction} className="mt-6 space-y-8">
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

        {/* Origem (Marketing) */}
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
