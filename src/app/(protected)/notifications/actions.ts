"use server";

import { revalidatePath } from "next/cache";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
