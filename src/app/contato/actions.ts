"use server";

import { redirect } from "next/navigation";
import nodemailer from "nodemailer";

import { getEmailEnv } from "@/lib/env";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactEmail(formData: FormData) {
  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const subject = getField(formData, "subject");
  const message = getField(formData, "message");

  if (!name || !email || !subject || !message) {
    redirect("/contato?error=Preencha+todos+os+campos+obrigat%C3%B3rios.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    redirect("/contato?error=Informe+um+e-mail+v%C3%A1lido.");
  }

  if (name.length > 120 || subject.length > 200 || message.length > 4000) {
    redirect(
      "/contato?error=Um+ou+mais+campos+excedem+o+tamanho+permitido.",
    );
  }

  try {
    const env = getEmailEnv();
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: "master@pododesk.com.br",
      replyTo: email,
      subject: `[Contato PodoDesk] ${subject}`,
      text: `Nome: ${name}\nE-mail: ${email}\nAssunto: ${subject}\n\n${message}`,
      html: `
        <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Assunto:</strong> ${escapeHtml(subject)}</p>
        <hr style="margin:16px 0" />
        <p style="white-space:pre-wrap;font-size:15px;">${escapeHtml(message)}</p>
      `,
    });
  } catch {
    redirect(
      "/contato?error=Erro+ao+enviar+a+mensagem.+Tente+novamente+em+instantes.",
    );
  }

  redirect("/contato?success=1");
}
