import webpush from "web-push";

import { getOptionalWebPushEnv } from "@/lib/env";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureAndGetClient() {
  const env = getOptionalWebPushEnv();

  if (!env) {
    return null;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );

  return webpush;
}

export async function sendWebPushNotification(
  subscription: StoredPushSubscription,
  payload: Record<string, unknown>,
) {
  const client = configureAndGetClient();

  if (!client) {
    console.error(
      "[web-push] VAPID não configurado — NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT ausentes no env.",
    );
    throw new Error("Configuração VAPID ausente para envio de push.");
  }

  await client.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}
