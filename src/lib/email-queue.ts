import { sendAppointmentDecisionEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const APPOINTMENT_DECISION_EVENT = "appointment_decision_email";

type AppointmentDecision = "confirmed" | "canceled";

export type AppointmentDecisionQueuePayload = {
  to: string;
  patientName: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
  decision: AppointmentDecision;
};

type EmailQueueRow = {
  id: string;
  payload: AppointmentDecisionQueuePayload;
  attempts: number;
  max_attempts: number;
};

function computeNextAttemptAt(attempt: number) {
  const baseSeconds = Math.min(300, 15 * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + baseSeconds * 1000).toISOString();
}

function normalizeQueueError(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 1000);
  }

  return "Erro desconhecido ao processar fila de e-mail.";
}

export async function enqueueAppointmentDecisionEmail(input: {
  tenantId: string;
  payload: AppointmentDecisionQueuePayload;
}) {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("email_queue").insert({
    tenant_id: input.tenantId,
    event_type: APPOINTMENT_DECISION_EVENT,
    payload: input.payload,
    status: "pending",
    attempts: 0,
    max_attempts: 3,
    next_attempt_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Falha ao enfileirar e-mail: ${error.message}`);
  }
}

async function claimQueueItem(rowId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("email_queue")
    .update({ status: "processing" })
    .eq("id", rowId)
    .in("status", ["pending", "failed"])
    .select("id, payload, attempts, max_attempts")
    .single();

  if (error || !data) {
    return null;
  }

  return data as EmailQueueRow;
}

async function incrementAttemptForProcessing(
  rowId: string,
  currentAttempts: number,
) {
  const adminClient = createAdminClient();
  const nextAttempts = currentAttempts + 1;
  await adminClient
    .from("email_queue")
    .update({ attempts: nextAttempts })
    .eq("id", rowId);

  return nextAttempts;
}

export async function processPendingEmailQueue(input?: { limit?: number }) {
  const adminClient = createAdminClient();
  const limit = Math.max(1, Math.min(input?.limit ?? 20, 100));
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await adminClient
    .from("email_queue")
    .select("id")
    .eq("event_type", APPOINTMENT_DECISION_EVENT)
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Falha ao buscar fila de e-mail: ${error.message}`);
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const claimed = await claimQueueItem(row.id);
    if (!claimed) {
      continue;
    }

    const attempts = await incrementAttemptForProcessing(
      claimed.id,
      claimed.attempts,
    );

    try {
      await sendAppointmentDecisionEmail(claimed.payload);

      await adminClient
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", claimed.id);

      sent += 1;
    } catch (sendError) {
      const canRetry = attempts < claimed.max_attempts;

      await adminClient
        .from("email_queue")
        .update({
          status: "failed",
          last_error: normalizeQueueError(sendError),
          next_attempt_at: canRetry ? computeNextAttemptAt(attempts) : null,
        })
        .eq("id", claimed.id);

      failed += 1;
    }
  }

  return {
    processed: (rows ?? []).length,
    sent,
    failed,
  };
}

export async function getEmailQueueStats() {
  const adminClient = createAdminClient();

  const [
    pendingResult,
    processingResult,
    failedResult,
    sentResult,
    oldestResult,
  ] = await Promise.all([
    adminClient
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("event_type", APPOINTMENT_DECISION_EVENT)
      .eq("status", "pending"),
    adminClient
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("event_type", APPOINTMENT_DECISION_EVENT)
      .eq("status", "processing"),
    adminClient
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("event_type", APPOINTMENT_DECISION_EVENT)
      .eq("status", "failed"),
    adminClient
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("event_type", APPOINTMENT_DECISION_EVENT)
      .eq("status", "sent"),
    adminClient
      .from("email_queue")
      .select("id, created_at, next_attempt_at")
      .eq("event_type", APPOINTMENT_DECISION_EVENT)
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    pending: pendingResult.count ?? 0,
    processing: processingResult.count ?? 0,
    failed: failedResult.count ?? 0,
    sent: sentResult.count ?? 0,
    oldestPending:
      oldestResult.data === null
        ? null
        : {
            id: oldestResult.data.id,
            createdAt: oldestResult.data.created_at,
            nextAttemptAt: oldestResult.data.next_attempt_at,
          },
  };
}
