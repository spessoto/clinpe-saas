import { NextRequest, NextResponse } from "next/server";

import {
  getEmailQueueStats,
  processPendingEmailQueue,
} from "@/lib/email-queue";
import { safeSecretEqual } from "@/lib/utils";

function getCronSecretFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return request.headers.get("x-cron-secret") ?? "";
}

function validateCronSecret(request: NextRequest) {
  const configuredSecret = process.env.EMAIL_QUEUE_CRON_SECRET ?? "";
  if (!configuredSecret) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "EMAIL_QUEUE_CRON_SECRET não configurado. Defina a variável para habilitar o processamento da fila.",
        },
        { status: 503 },
      ),
    };
  }

  const incomingSecret = getCronSecretFromRequest(request);
  if (!incomingSecret || !safeSecretEqual(incomingSecret, configuredSecret)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = validateCronSecret(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const stats = await getEmailQueueStats();
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao consultar fila.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = validateCronSecret(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

  try {
    const result = await processPendingEmailQueue({
      limit:
        typeof parsedLimit === "number" && Number.isFinite(parsedLimit)
          ? parsedLimit
          : undefined,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao processar fila.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
