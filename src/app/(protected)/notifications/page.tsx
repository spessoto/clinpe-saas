import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(protected)/notifications/actions";
import { NotificationPreferences } from "@/app/(protected)/notifications/notification-preferences";
import { requireActiveTenant } from "@/lib/auth";
import { getOptionalWebPushEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  payload: {
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    scheduledAt?: string;
  } | null;
};

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "Não informado";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function NotificationsPage() {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const webPushEnv = getOptionalWebPushEnv();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at, payload")
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notificationList = (notifications ?? []) as NotificationRow[];
  const unreadCount = notificationList.filter(
    (notification) => !notification.read_at,
  ).length;

  return (
    <section className="space-y-6">
      <article className="surface-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Notificações</h2>
            <p className="mt-1 text-sm text-muted">
              Acompanhe novas consultas e marque os avisos como lidos.
            </p>
          </div>

          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="btn-outline-modern">
                Marcar tudo como lido
              </button>
            </form>
          ) : null}
        </div>

        <p className="mt-4 text-sm text-muted">
          {unreadCount > 0
            ? `${unreadCount} notificação(ões) pendente(s).`
            : "Nenhuma notificação pendente no momento."}
        </p>
      </article>

      <NotificationPreferences
        vapidPublicKey={webPushEnv?.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      />

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">
          Histórico recente
        </h3>

        <div className="mt-4 space-y-3">
          {notificationList.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-muted">
              Nenhuma notificação registrada ainda.
            </p>
          ) : (
            notificationList.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border px-4 py-4 ${notification.read_at ? "border-slate-200 bg-white" : "border-primary/25 bg-primary/5"}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {notification.title}
                      </h4>
                      {!notification.read_at ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Nova
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {notification.body}
                    </p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Paciente
                        </dt>
                        <dd className="text-foreground">
                          {notification.payload?.patientName ?? "Não informado"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          E-mail
                        </dt>
                        <dd className="text-foreground">
                          {notification.payload?.patientEmail ??
                            "Não informado"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Telefone
                        </dt>
                        <dd className="text-foreground">
                          {notification.payload?.patientPhone ??
                            "Não informado"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Data e hora
                        </dt>
                        <dd className="text-foreground">
                          {formatDateTime(notification.payload?.scheduledAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <p className="text-xs text-muted">
                      {formatDateTime(notification.created_at)}
                    </p>
                    {!notification.read_at ? (
                      <form action={markNotificationReadAction}>
                        <input
                          type="hidden"
                          name="notification_id"
                          value={notification.id}
                        />
                        <button
                          type="submit"
                          className="btn-outline-modern px-3 py-2 text-xs"
                        >
                          Marcar como lida
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-muted">
                        Lida em {formatDateTime(notification.read_at)}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
