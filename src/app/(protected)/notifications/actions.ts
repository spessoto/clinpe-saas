"use server";

import { revalidatePath } from "next/cache";

import { requireActiveTenant } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  type StoredPushSubscription,
  sendWebPushNotification,
} from "@/lib/web-push";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = getField(formData, "notification_id");

  if (!notificationId) {
    return;
  }

  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", appUser.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function markAllNotificationsReadAction() {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", appUser.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function sendTestPushAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const { appUser } = await requireActiveTenant();
  const adminClient = createAdminClient();

  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", appUser.id);

  if (error) {
    return {
      ok: false,
      message: `Erro ao buscar subscriptions: ${error.message}`,
    };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      ok: false,
      message:
        "Nenhuma subscription encontrada. Desative e ative o push novamente.",
    };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendWebPushNotification(sub as StoredPushSubscription, {
        title: "Teste de push",
        body: "Se você está vendo esta notificação, o push está funcionando!",
        url: "/notifications",
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");

  if (failed.length > 0) {
    const firstError =
      failed[0].status === "rejected"
        ? failed[0].reason instanceof Error
          ? failed[0].reason.message
          : String(failed[0].reason)
        : "";
    return {
      ok: false,
      message: `${succeeded}/${subscriptions.length} enviados. Erro: ${firstError}`,
    };
  }

  return {
    ok: true,
    message: `Push de teste enviado para ${succeeded} dispositivo(s).`,
  };
}
