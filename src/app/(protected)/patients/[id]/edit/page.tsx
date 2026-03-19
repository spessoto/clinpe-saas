import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePatientAction } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPatientPage({ params, searchParams }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const { id } = await params;
  const paramsSearch = await searchParams;
  const error =
    typeof paramsSearch.error === "string" ? paramsSearch.error : null;

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, name, phone, birth_date, cpf, rg, email, address_street, address_neighborhood, address_zipcode, occupation, emergency_contact_name, emergency_contact_phone, referral_source",
    )
    .eq("id", id)
    .eq("tenant_id", appUser.tenant_id)
    .single();

  if (!patient) {
    redirect(
      `/patients?error=${encodeURIComponent("Paciente não encontrado para edição neste usuário.")}`,
    );
  }

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
              defaultValue={patient.referral_source ?? ""}
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
