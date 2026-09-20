"use server";

import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = {
  name: string;
  email: string;
  message: string;
};

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  input: ContactInput
): Promise<ContactResult> {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Todos los campos son obligatorios." };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "El correo electrónico no es válido." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "respinofz@gmail.com",
      replyTo: email,
      subject: "Nuevo mensaje de contacto — Arcade Vault",
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde.",
    };
  }
}
