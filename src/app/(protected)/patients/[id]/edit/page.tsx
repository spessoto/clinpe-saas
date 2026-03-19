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
    .select("id, name, phone, birth_date")
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

      <form action={updatePatientAction} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={patient.id} />

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Nome</span>
          <input
            name="name"
            required
            defaultValue={patient.name}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Telefone</span>
          <input
            name="phone"
            required
            defaultValue={patient.phone}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground">Data de nascimento</span>
          <input
            type="date"
            name="birth_date"
            defaultValue={patient.birth_date ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
          />
        </label>

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
