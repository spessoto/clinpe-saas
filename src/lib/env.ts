import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const adminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

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
      `Variaveis de ambiente invalidas/ausentes: ${missing}. ` +
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
      "Variavel ausente: SUPABASE_SERVICE_ROLE_KEY. Configure-a no .env.local para habilitar booking publico e operacoes admin do Supabase.",
    );
  }

  if (parsed.data.SUPABASE_SERVICE_ROLE_KEY.includes("REPLACE_WITH")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY esta com valor placeholder no .env.local. Configure a chave real para habilitar as rotas publicas de agendamento.",
    );
  }

  return parsed.data;
}

export function getGoogleEnv() {
  const parsed = googleEnvSchema.safeParse({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Variaveis de Google ausentes/invalidas: ${missing}. Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local.`,
    );
  }

  return parsed.data;
}
