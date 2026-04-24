import {
  cancelInviteAction,
  inviteStaffAction,
  removeStaffAction,
  resendInviteAction,
} from "@/app/(protected)/settings/team/actions";
import { requireTier3Owner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_STAFF = 9;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type StaffUser = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type PendingInvite = {
  id: string;
  email: string;
  full_name: string | null;
  expires_at: string;
  created_at: string;
  token: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function TeamPage({ searchParams }: Props) {
  const { appUser } = await requireTier3Owner();
  const supabase = await createClient();
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  const [staffResult, invitesResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, created_at")
      .eq("tenant_id", appUser.tenant_id)
      .eq("role", "staff")
      .order("created_at", { ascending: true }),
    supabase
      .from("user_invites")
      .select("id, email, full_name, expires_at, created_at, token")
      .eq("tenant_id", appUser.tenant_id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const staffMembers = (staffResult.data ?? []) as StaffUser[];
  const pendingInvites = (invitesResult.data ?? []) as PendingInvite[];
  const slotsUsed = staffMembers.length + pendingInvites.length;
  const slotsLeft = Math.max(0, MAX_STAFF - slotsUsed);
  const canInvite = slotsLeft > 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Equipe</h2>
        <p className="mt-1 text-muted">
          Gerencie os profissionais da sua clínica.
        </p>
      </div>

      {success ? (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Slot counter */}
      <article className="surface-card p-6">
        <p className="text-sm font-semibold text-secondary">
          {slotsUsed} de {MAX_STAFF} profissionais convidados
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${Math.min(100, (slotsUsed / MAX_STAFF) * 100)}%`,
            }}
          />
        </div>
        {slotsLeft === 0 ? (
          <p className="mt-2 text-xs text-destructive">
            Limite atingido. Remova um profissional ou cancele um convite para
            liberar espaço.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            {slotsLeft} vaga{slotsLeft !== 1 ? "s" : ""} disponível
            {slotsLeft !== 1 ? "is" : ""}.
          </p>
        )}
      </article>

      {/* Active staff */}
      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">
          Profissionais ativos
        </h3>

        {staffMembers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nenhum profissional adicionado ainda.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {staffMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{member.full_name}</p>
                  <p className="text-xs text-muted">{member.email}</p>
                  <p className="text-xs text-muted">
                    Desde {formatDate(member.created_at)}
                  </p>
                </div>
                <form action={removeStaffAction}>
                  <input type="hidden" name="user_id" value={member.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-destructive/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Pending invites */}
      {pendingInvites.length > 0 ? (
        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Convites pendentes
          </h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {invite.full_name ?? invite.email}
                  </p>
                  <p className="text-xs text-muted">{invite.email}</p>
                  <p className="text-xs text-muted">
                    Expira em {formatDate(invite.expires_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={resendInviteAction}>
                    <input type="hidden" name="invite_id" value={invite.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-primary/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      Reenviar
                    </button>
                  </form>
                  <form action={cancelInviteAction}>
                    <input type="hidden" name="invite_id" value={invite.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-destructive/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Cancelar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {/* Invite form */}
      {canInvite ? (
        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Convidar profissional
          </h3>
          <p className="mt-1 text-sm text-muted">
            O convidado receberá um e-mail para criar sua conta e acessar a
            clínica.
          </p>
          <form
            action={inviteStaffAction}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                Nome (opcional)
              </span>
              <input
                name="full_name"
                placeholder="Ex.: Dra. Ana Costa"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                E-mail <span className="text-destructive">*</span>
              </span>
              <input
                type="email"
                name="email"
                required
                placeholder="profissional@email.com"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-gradient px-5 py-2">
                Enviar convite
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}
