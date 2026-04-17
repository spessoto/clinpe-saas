import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const adminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const panelAdminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().email(),
});

const emailEnvSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
});

const webPushEnvSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1).default("mailto:contato@pododesk.com.br"),
});

const asaasEnvSchema = z.object({
  ASAAS_API_KEY: z.string().min(1),
  ASAAS_WEBHOOK_SECRET: z.string().min(1),
  ASAAS_API_BASE: z.string().url().default("https://api.asaas.com/v3"),
});

const evolutionEnvSchema = z.object({
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1),
});

const whatsappReminderEnvSchema = z.object({
  WHATSAPP_REMINDER_CRON_SECRET: z.string().min(1),
});

const PRODUCTION_APP_URL = "https://pododesk.com.br";

export type AppEnv = z.infer<typeof serverEnvSchema>;

export function getEnv(): AppEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Variáveis de ambiente inválidas/ausentes: ${missing}. ` +
        "Crie o arquivo .env.local na raiz do projeto e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return parsed.data;
}

export function getAdminEnv() {
  const parsed = adminEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Variável ausente: SUPABASE_SERVICE_ROLE_KEY. Configure-a no .env.local para habilitar booking público e operações admin do Supabase.",
    );
  }

  if (parsed.data.SUPABASE_SERVICE_ROLE_KEY.includes("REPLACE_WITH")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY está com valor placeholder no .env.local. Configure a chave real para habilitar as rotas públicas de agendamento.",
    );
  }

  return parsed.data;
}

export function getPanelAdminEnv() {
  const parsed = panelAdminEnvSchema.safeParse({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  });

  if (!parsed.success) {
    throw new Error(
      "Variável ausente ou inválida: ADMIN_EMAIL. Configure o e-mail administrativo no .env.local para habilitar o painel admin.",
    );
  }

  return parsed.data;
}

export function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_APP_URL
    : "http://localhost:3000";
}

export function getEmailEnv() {
  const parsed = emailEnvSchema.safeParse({
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Configuração de e-mail ausente ou inválida: ${missing}. Preencha SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env.local.`,
    );
  }

  return parsed.data;
}

export function getOptionalWebPushEnv() {
  const parsed = webPushEnvSchema.safeParse({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function getAsaasEnv() {
  const parsed = asaasEnvSchema.safeParse({
    ASAAS_API_KEY: process.env.ASAAS_API_KEY,
    ASAAS_WEBHOOK_SECRET: process.env.ASAAS_WEBHOOK_SECRET,
    ASAAS_API_BASE: process.env.ASAAS_API_BASE,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Variáveis do Asaas ausentes: ${missing}. Configure ASAAS_API_KEY, ASAAS_WEBHOOK_SECRET e ASAAS_API_BASE no .env.local.`,
    );
  }

  return parsed.data;
}

export function getEvolutionEnv() {
  const parsed = evolutionEnvSchema.safeParse({
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Variáveis da Evolution API ausentes: ${missing}. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_WEBHOOK_SECRET no .env.local.`,
    );
  }

  return parsed.data;
}

export function getWhatsAppReminderEnv() {
  const parsed = whatsappReminderEnvSchema.safeParse({
    WHATSAPP_REMINDER_CRON_SECRET: process.env.WHATSAPP_REMINDER_CRON_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      "Variável ausente: WHATSAPP_REMINDER_CRON_SECRET. Configure-a no .env.local para habilitar lembretes de consulta via WhatsApp.",
    );
  }

  return parsed.data;
}
