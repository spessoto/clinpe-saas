#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const userEmail = getArg("email");
const minutes = Number.parseInt(getArg("minutes", "120"), 10);

if (!userEmail) {
  console.error(
    "Uso: npm.cmd run ops:booking-flow -- --email=profissional@dominio.com --minutes=120",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sinceIso = new Date(
  Date.now() - Math.max(minutes, 1) * 60 * 1000,
).toISOString();

const smtpConfigured = [
  process.env.SMTP_HOST,
  process.env.SMTP_PORT,
  process.env.SMTP_USER,
  process.env.SMTP_PASS,
  process.env.SMTP_FROM,
].every(Boolean);

const webPushConfigured = [
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
  process.env.VAPID_SUBJECT,
].every(Boolean);

try {
  const authResponse = await supabase.auth.admin.listUsers();
  const authUser = authResponse.data.users.find(
    (user) => (user.email ?? "").toLowerCase() === userEmail.toLowerCase(),
  );

  if (!authUser) {
    console.error(`Usuário não encontrado no Auth: ${userEmail}`);
    process.exit(1);
  }

  const profileResponse = await supabase
    .from("users")
    .select("id, tenant_id, full_name, email")
    .eq("id", authUser.id)
    .single();

  if (profileResponse.error || !profileResponse.data) {
    throw new Error(
      profileResponse.error?.message ??
        "Perfil não encontrado em public.users.",
    );
  }

  const profile = profileResponse.data;

  const [
    appointmentsResponse,
    notificationsResponse,
    pushResponse,
    emailQueueResponse,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, created_at, scheduled_at, status", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .eq("professional_id", profile.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id, created_at, title, read_at, payload", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .eq("user_id", profile.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("push_subscriptions")
      .select("id, endpoint, created_at", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .eq("user_id", profile.id)
      .limit(10),
    supabase
      .from("email_queue")
      .select("id, created_at, event_type, status, payload", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .in("event_type", [
        "appointment_new_booking_patient_email",
        "appointment_new_booking_professional_email",
      ])
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const summary = {
    checkedAt: new Date().toISOString(),
    windowMinutes: minutes,
    config: {
      smtpConfigured,
      webPushConfigured,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    },
    professional: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      tenantId: profile.tenant_id,
      emailConfirmedAt: authUser.email_confirmed_at ?? null,
    },
    results: {
      appointmentsCreated: appointmentsResponse.count ?? 0,
      notificationsCreated: notificationsResponse.count ?? 0,
      pushSubscriptionsRegistered: pushResponse.count ?? 0,
      queuedBookingEmails: emailQueueResponse.count ?? 0,
    },
    recentAppointments: appointmentsResponse.data ?? [],
    recentNotifications: notificationsResponse.data ?? [],
    recentPushSubscriptions: (pushResponse.data ?? []).map((item) => ({
      id: item.id,
      created_at: item.created_at,
      endpointHost: (() => {
        try {
          return new URL(item.endpoint).host;
        } catch {
          return "invalid";
        }
      })(),
    })),
    recentQueuedEmails: (emailQueueResponse.data ?? []).map((item) => ({
      id: item.id,
      created_at: item.created_at,
      event_type: item.event_type,
      status: item.status,
      to: item.payload?.to ?? null,
    })),
    notes: [
      "Ausência de filas de e-mail não prova falha de envio: o app tenta SMTP imediato antes do fallback em email_queue.",
      "Para push funcionar, o profissional precisa ter ativado /notifications no navegador e criado ao menos uma push_subscription.",
    ],
  };

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
