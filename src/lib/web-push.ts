import webpush from "web-push";

import { getOptionalWebPushEnv } from "@/lib/env";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let isConfigured = false;

function getWebPushClient() {
  const env = getOptionalWebPushEnv();

  if (!env) {
    return null;
  }

  if (!isConfigured) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    isConfigured = true;
  }

  return webpush;
}

export async function sendWebPushNotification(
  subscription: StoredPushSubscription,
  payload: Record<string, unknown>,
) {
  const client = getWebPushClient();

  if (!client) {
    return { delivered: false, reason: "missing_config" as const };
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

  return { delivered: true as const };
}
