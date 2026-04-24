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

export type AppointmentNewBookingPatientEmailInput = {
  to: string;
  patientName: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
};

export type AppointmentNewBookingProfessionalEmailInput = {
  to: string;
  clinicName: string;
  professionalName: string;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
};

function getTransporter() {
  const env = getEmailEnv();
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
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

function buildNewBookingPatientCopy(
  input: AppointmentNewBookingPatientEmailInput,
) {
  const formattedDate = formatAppointmentDate(input.scheduledAt);
  const subject = `${input.clinicName}: recebemos seu pedido de agendamento`;
  const text = [
    "Pedido de agendamento recebido",
    "",
    `Olá, ${input.patientName}. Recebemos sua solicitação de consulta.`,
    `Clínica: ${input.clinicName}`,
    `Profissional: ${input.professionalName}`,
    `Data e hora solicitadas: ${formattedDate}`,
    "",
    "A clínica analisará o pedido e entrará em contato se precisar de qualquer ajuste.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
      <h1 style="color: #0D9488; font-size: 24px; margin-bottom: 16px;">Pedido de agendamento recebido</h1>
      <p>Olá, ${input.patientName}. Recebemos sua solicitação de consulta.</p>
      <div style="margin: 20px 0; padding: 16px; border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC;">
        <p style="margin: 0 0 8px;"><strong>Clínica:</strong> ${input.clinicName}</p>
        <p style="margin: 0 0 8px;"><strong>Profissional:</strong> ${input.professionalName}</p>
        <p style="margin: 0;"><strong>Data e hora solicitadas:</strong> ${formattedDate}</p>
      </div>
      <p>A clínica analisará o pedido e entrará em contato se precisar de qualquer ajuste.</p>
    </div>
  `;

  return { subject, text, html };
}

function buildNewBookingProfessionalCopy(
  input: AppointmentNewBookingProfessionalEmailInput,
) {
  const formattedDate = formatAppointmentDate(input.scheduledAt);
  const subject = `${input.clinicName}: nova consulta agendada para ${input.professionalName}`;
  const text = [
    "Nova consulta agendada",
    "",
    `Uma nova consulta foi solicitada para ${input.professionalName}.`,
    `Paciente: ${input.patientName}`,
    `E-mail do paciente: ${input.patientEmail}`,
    `Telefone do paciente: ${input.patientPhone}`,
    `Data e hora solicitadas: ${formattedDate}`,
    "",
    "Abra a agenda do sistema para acompanhar e confirmar o atendimento.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
      <h1 style="color: #0D9488; font-size: 24px; margin-bottom: 16px;">Nova consulta agendada</h1>
      <p>Uma nova consulta foi solicitada para ${input.professionalName}.</p>
      <div style="margin: 20px 0; padding: 16px; border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC;">
        <p style="margin: 0 0 8px;"><strong>Paciente:</strong> ${input.patientName}</p>
        <p style="margin: 0 0 8px;"><strong>E-mail do paciente:</strong> ${input.patientEmail}</p>
        <p style="margin: 0 0 8px;"><strong>Telefone do paciente:</strong> ${input.patientPhone}</p>
        <p style="margin: 0;"><strong>Data e hora solicitadas:</strong> ${formattedDate}</p>
      </div>
      <p>Abra a agenda do sistema para acompanhar e confirmar o atendimento.</p>
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

export async function sendAppointmentNewBookingPatientEmail(
  input: AppointmentNewBookingPatientEmailInput,
) {
  const env = getEmailEnv();
  const mail = buildNewBookingPatientCopy(input);

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

export async function sendAppointmentNewBookingProfessionalEmail(
  input: AppointmentNewBookingProfessionalEmailInput,
) {
  const env = getEmailEnv();
  const mail = buildNewBookingProfessionalCopy(input);

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

// ─── Staff invite ─────────────────────────────────────────────────────────────

export type StaffInviteEmailInput = {
  to: string;
  inviteeName: string;
  clinicName: string;
  ownerName: string;
  joinUrl: string;
};

export async function sendStaffInviteEmail(input: StaffInviteEmailInput) {
  const env = getEmailEnv();
  const subject = `${input.clinicName}: você foi convidado para usar o PodoDesk`;

  const text = [
    `Convite para ${input.clinicName}`,
    "",
    `Olá, ${input.inviteeName}!`,
    `${input.ownerName} convidou você para fazer parte da equipe da clínica ${input.clinicName} no PodoDesk.`,
    "",
    "Para aceitar o convite e criar sua conta, acesse o link abaixo:",
    input.joinUrl,
    "",
    "O link expira em 7 dias. Se você não esperava este convite, pode ignorar este e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
      <h1 style="color: #0D9488; font-size: 24px; margin-bottom: 16px;">Convite para ${input.clinicName}</h1>
      <p>Olá, ${input.inviteeName}!</p>
      <p><strong>${input.ownerName}</strong> convidou você para fazer parte da equipe da clínica
         <strong>${input.clinicName}</strong> no PodoDesk.</p>
      <div style="margin: 24px 0;">
        <a href="${input.joinUrl}"
           style="display: inline-block; background: #0D9488; color: #fff; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; font-weight: bold;">
          Aceitar convite
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B;">
        O link expira em 7 dias. Se você não esperava este convite, pode ignorar este e-mail.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html,
  });
}
