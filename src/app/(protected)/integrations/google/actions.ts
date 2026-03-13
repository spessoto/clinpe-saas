"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractWidgetUrl(rawInput: string) {
  const trimmed = rawInput.trim();

  // Accept full iframe embed code and extract src when provided.
  const iframeSrcMatch = trimmed.match(
    /<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i,
  );
  const candidate = iframeSrcMatch?.[1]
    ? decodeHtmlEntities(iframeSrcMatch[1])
    : trimmed;

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return {
      ok: false as const,
      message:
        "Cole uma URL valida ou o codigo completo do iframe do Google Calendar",
    };
  }

  const host = parsed.hostname.toLowerCase();
  const validHost =
    host === "calendar.google.com" ||
    host === "calendar.app.google" ||
    host.endsWith(".google.com") ||
    host.endsWith(".app.google");

  if (!validHost) {
    return {
      ok: false as const,
      message: "Use uma URL/embed do Google Calendar Appointment Schedule",
    };
  }

  return { ok: true as const, url: parsed.toString() };
}

export async function saveBookingWidgetUrlAction(formData: FormData) {
  const widgetCode = getField(formData, "booking_widget_code");

  if (!widgetCode) {
    redirect("/settings?error=Informe a URL ou o codigo iframe do widget");
  }

  const parsedWidget = extractWidgetUrl(widgetCode);
  if (!parsedWidget.ok) {
    redirect(`/settings?error=${encodeURIComponent(parsedWidget.message)}`);
  }

  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("google_integrations")
    .update({ booking_widget_url: parsedWidget.url })
    .eq("tenant_id", appUser.tenant_id)
    .eq("user_id", appUser.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?success=Widget de agendamento atualizado");
}
