import nodemailer from "nodemailer";

import { getEmailEnv } from "@/lib/env";

type AppointmentDecision = "confirmed" | "canceled";

type AppointmentDecisionEmailInput = {
  to: string;
  patientName: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
  decision: AppointmentDecision;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const env = getEmailEnv();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function buildDecisionCopy(input: AppointmentDecisionEmailInput) {
  const formattedDate = formatAppointmentDate(input.scheduledAt);
  const isConfirmed = input.decision === "confirmed";
  const subject = isConfirmed
    ? `${input.clinicName}: seu agendamento foi confirmado`
    : `${input.clinicName}: seu agendamento não foi aprovado`;
  const heading = isConfirmed
    ? "Agendamento confirmado"
    : "Agendamento cancelado";
  const intro = isConfirmed
    ? `Olá, ${input.patientName}. Seu agendamento foi confirmado com sucesso.`
    : `Olá, ${input.patientName}. Infelizmente seu agendamento não foi aprovado e foi cancelado.`;
  const nextStep = isConfirmed
    ? "Se precisar remarcar, responda este e-mail ou entre em contato com a clínica."
    : "Se desejar, entre em contato com a clínica para escolher um novo horário.";

  const text = [
    heading,
    "",
    intro,
    `Clínica: ${input.clinicName}`,
    `Profissional: ${input.professionalName}`,
    `Data e hora: ${formattedDate}`,
    "",
    nextStep,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
      <h1 style="color: #0D9488; font-size: 24px; margin-bottom: 16px;">${heading}</h1>
      <p>${intro}</p>
      <div style="margin: 20px 0; padding: 16px; border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC;">
        <p style="margin: 0 0 8px;"><strong>Clínica:</strong> ${input.clinicName}</p>
        <p style="margin: 0 0 8px;"><strong>Profissional:</strong> ${input.professionalName}</p>
        <p style="margin: 0;"><strong>Data e hora:</strong> ${formattedDate}</p>
      </div>
      <p>${nextStep}</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendAppointmentDecisionEmail(
  input: AppointmentDecisionEmailInput,
) {
  const env = getEmailEnv();
  const mail = buildDecisionCopy(input);

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

export async function sendAppointmentDecisionEmailWithTimeout(
  input: AppointmentDecisionEmailInput,
  timeoutMs = 1200,
) {
  const timedResult = await Promise.race([
    sendAppointmentDecisionEmail(input).then(() => "sent" as const),
    new Promise<"timed_out">((resolve) => {
      setTimeout(() => resolve("timed_out"), timeoutMs);
    }),
  ]);

  return timedResult;
}
