import Link from "next/link";

import { getPatientCountStatus } from "@/app/(protected)/patients/actions";
import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const { appUser, tenant } = await requireActiveTenant();
  const supabase = await createClient();
  const limitStatus = await getPatientCountStatus();

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const error = typeof params.error === "string" ? params.error : null;

  let query = supabase
    .from("patients")
    .select("id, name, phone, birth_date, created_at")
    .eq("tenant_id", appUser.tenant_id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: patients } = await query;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Pacientes</h2>
          <p className="mt-1 text-muted">
            {limitStatus.current}/{limitStatus.max} • {' '}
            {limitStatus.remainingSlots > 0
              ? `${limitStatus.remainingSlots} slot${limitStatus.remainingSlots !== 1 ? 's' : ''} disponível${limitStatus.remainingSlots !== 1 ? 's' : ''}`
              : 'Limite atingido'}
          </p>
        </div>

        {limitStatus.isLimitReached ? (
          <Link href="/billing" className="btn-outline-modern">
            Fazer Upgrade
          </Link>
        ) : (
          <Link href="/patients/new" className="btn-gradient">
            Novo paciente
          </Link>
        )}
      </div>

      <form className="mb-4 flex gap-2" action="/patients" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
        />
        <button type="submit" className="btn-outline-modern">
          Buscar
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {limitStatus.remainingSlots <= 3 && !limitStatus.isLimitReached && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
          <p className="text-sm font-semibold text-warning">
            ⚠️ Você tem apenas <strong>{limitStatus.remainingSlots}</strong> slot{limitStatus.remainingSlots !== 1 ? 's' : ''} restante{limitStatus.remainingSlots !== 1 ? 's' : ''} no seu plano {tenant.billing_tier}.
            {' '}
            <Link href="/billing" className="font-bold hover:underline">
              Fazer upgrade →
            </Link>
          </p>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Nascimento</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {(patients ?? []).map((patient) => (
              <tr key={patient.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-foreground">
                  {patient.name}
                </td>
                <td className="px-4 py-3 text-muted">{patient.phone}</td>
                <td className="px-4 py-3 text-muted">
                  {patient.birth_date
                    ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}

            {patients && patients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  Nenhum paciente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
