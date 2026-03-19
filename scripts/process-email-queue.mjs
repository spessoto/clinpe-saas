#!/usr/bin/env node

const secret = process.env.EMAIL_QUEUE_CRON_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const limit = Number.parseInt(process.env.EMAIL_QUEUE_BATCH_LIMIT ?? "20", 10);

if (!secret) {
  console.error("EMAIL_QUEUE_CRON_SECRET nao definido.");
  process.exit(1);
}

const safeLimit =
  Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
const processUrl = `${appUrl.replace(/\/$/, "")}/api/internal/email-queue/process?limit=${safeLimit}`;
const statusUrl = `${appUrl.replace(/\/$/, "")}/api/internal/email-queue/process`;

async function call(url, method) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
    },
    cache: "no-store",
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { response, json };
}

try {
  const statusBefore = await call(statusUrl, "GET");
  if (!statusBefore.response.ok) {
    console.error(
      "Falha ao consultar status da fila:",
      statusBefore.json ?? statusBefore.response.statusText,
    );
    process.exit(1);
  }

  const processResult = await call(processUrl, "POST");
  if (!processResult.response.ok) {
    console.error(
      "Falha ao processar fila:",
      processResult.json ?? processResult.response.statusText,
    );
    process.exit(1);
  }

  const statusAfter = await call(statusUrl, "GET");
  if (!statusAfter.response.ok) {
    console.error(
      "Fila processada, mas falhou ao consultar status final:",
      statusAfter.json ?? statusAfter.response.statusText,
    );
    process.exit(1);
  }

  console.log("STATUS_ANTES:", JSON.stringify(statusBefore.json));
  console.log("PROCESSAMENTO:", JSON.stringify(processResult.json));
  console.log("STATUS_DEPOIS:", JSON.stringify(statusAfter.json));
} catch (error) {
  console.error(
    "Erro inesperado no processamento da fila:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
