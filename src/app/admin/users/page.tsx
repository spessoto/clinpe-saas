import { AlertCircle, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";

import { getAdminUsersList } from "@/app/admin/users/actions";
import { ToggleAdminButton } from "@/app/admin/users/toggle-admin-button";
import { requireAdminAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  success?: string;
}>;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminUsersPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const currentAdmin = await requireAdminAccess();
  const users = await getAdminUsersList();

  const adminCount = users.filter((u) => u.is_admin).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado
            {users.length !== 1 ? "s" : ""} • {adminCount} admin
            {adminCount !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition"
        >
          Voltar
        </Link>
      </div>

      {/* Error message */}
      {searchParams.error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">{searchParams.error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {searchParams.success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">{searchParams.success}</p>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">E-mail</th>
                <th className="px-6 py-3 text-left font-semibold">Nome</th>
                <th className="px-6 py-3 text-left font-semibold">Admin</th>
                <th className="px-6 py-3 text-left font-semibold">
                  Data de Cadastro
                </th>
                <th className="px-6 py-3 text-left font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="px-6 py-4 font-medium">{user.email}</td>
                    <td className="px-6 py-4">{user.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.is_admin && (
                          <>
                            <Shield className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-600">
                              Admin
                            </span>
                          </>
                        )}
                        {!user.is_admin && (
                          <span className="text-xs text-muted-foreground">
                            Usuário
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <ToggleAdminButton
                        userId={user.id}
                        userEmail={user.email}
                        isAdmin={user.is_admin}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Nota:</strong> Admins têm acesso completo ao painel
          administrativo e podem gerenciar planos, usuários e configurações da
          plataforma. Use com cuidado.
        </p>
      </div>
    </div>
  );
}
