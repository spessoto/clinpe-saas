"use client";

import { useEffect, useState } from "react";

import { sendTestPushAction } from "./actions";

type Props = {
  vapidPublicKey: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function NotificationPreferences({ vapidPublicKey }: Props) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    void (async () => {
      const registration = await navigator.serviceWorker.register(
        "/notification-sw.js",
      );
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
    })();
  }, []);

  async function enableNotifications() {
    if (!vapidPublicKey) {
      setMessage(
        "As variáveis VAPID ainda não foram configuradas neste ambiente.",
      );
      return;
    }

    setIsPending(true);
    setMessage(null);

    try {
      const requestedPermission =
        permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        setMessage("A permissão do navegador foi negada para notificações.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/notification-sw.js",
      );

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const response = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar assinatura de notificação.");
      }

      setIsSubscribed(true);
      setMessage("Push web ativado para novas consultas.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao ativar notificações web.",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function disableNotifications() {
    setIsPending(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.register(
        "/notification-sw.js",
      );
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/push-subscription", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setMessage("Push web desativado para este navegador.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao desativar notificações web.",
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!isSupported) {
    return (
      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">Push web</h3>
        <p className="mt-2 text-sm text-muted">
          Este navegador não suporta notificações web para novas consultas.
        </p>
      </article>
    );
  }

  return (
    <article className="surface-card p-6">
      <h3 className="text-lg font-semibold text-secondary">Push web</h3>
      <p className="mt-2 text-sm text-muted">
        Receba alertas no navegador sempre que uma nova consulta for agendada.
      </p>

      <p className="mt-3 text-xs text-muted">
        Permissão atual:{" "}
        {permission === "unsupported" ? "não suportado" : permission}
      </p>

      {message ? (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enableNotifications}
          disabled={isPending || isSubscribed}
          className="btn-gradient disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Processando..."
            : isSubscribed
              ? "Push ativo"
              : "Ativar push web"}
        </button>

        <button
          type="button"
          onClick={disableNotifications}
          disabled={isPending || !isSubscribed}
          className="btn-outline-modern disabled:cursor-not-allowed disabled:opacity-50"
        >
          Desativar neste navegador
        </button>

        <button
          type="button"
          disabled={isTesting || !isSubscribed}
          className="btn-outline-modern disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            setIsTesting(true);
            setMessage(null);
            try {
              const result = await sendTestPushAction();
              setMessage(result.message);
            } catch {
              setMessage("Erro ao testar push.");
            } finally {
              setIsTesting(false);
            }
          }}
        >
          {isTesting ? "Enviando..." : "Testar push"}
        </button>
      </div>
    </article>
  );
}
