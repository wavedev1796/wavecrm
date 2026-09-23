import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

type Recipient = { email: string; name: string };

/** Lo único que cambia entre un correo y otro: el resto (transporte, plantilla, escape) se comparte. */
type Message = {
  path: string;
  subject: string;
  heading: string;
  intro: string;
  action: string;
  expiry: string;
  footer: string;
};

const INVITATION: Message = {
  path: "/activar-cuenta",
  subject: "Activa tu cuenta de Wave CRM",
  heading: "Te invitaron a Wave CRM",
  intro: "Activa tu cuenta y crea tu contraseña.",
  action: "Activar mi cuenta",
  expiry: "El enlace vence en 48 horas.",
  footer: "Si no esperabas esta invitación, puedes ignorar este correo.",
};

const PASSWORD_RESET: Message = {
  path: "/restablecer-contrasena",
  subject: "Recupera tu contraseña de Wave CRM",
  heading: "Recupera tu contraseña",
  intro: "Pediste crear una contraseña nueva para tu cuenta de Wave CRM.",
  action: "Crear contraseña nueva",
  expiry: "El enlace vence en 1 hora y solo puede usarse una vez.",
  footer:
    "Si no lo pediste, ignora este correo: tu contraseña actual sigue funcionando.",
};

/**
 * Envío de correo transaccional. Responsabilidad única: entregar un mensaje.
 * Quién lo pide y por qué (invitar, recuperar) vive en los servicios de cada módulo,
 * así que añadir un correo nuevo no toca el transporte ni la plantilla.
 */
@Injectable()
export class MailerService {
  constructor(private readonly config: ConfigService) {}

  sendInvitation(recipient: Recipient, token: string) {
    return this.send(recipient, INVITATION, token);
  }

  sendPasswordReset(recipient: Recipient, token: string) {
    return this.send(recipient, PASSWORD_RESET, token);
  }

  private async send(recipient: Recipient, message: Message, token: string) {
    const appUrl =
      this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    const url = `${appUrl.replace(/\/$/, "")}${message.path}?token=${encodeURIComponent(token)}`;
    const smtpHost = this.config.get<string>("SMTP_HOST")?.trim();

    if (!smtpHost) {
      if (this.config.get<string>("NODE_ENV") === "production") {
        throw new ServiceUnavailableException(
          "El servicio de correo no está configurado.",
        );
      }
      console.info(`[Wave CRM] ${message.subject} · ${recipient.email}: ${url}`);
      return;
    }

    const port = parsePort(this.config.get<string>("SMTP_PORT"));
    const user = this.config.get<string>("SMTP_USER")?.trim();
    const pass = this.config.get<string>("SMTP_PASS");
    if (Boolean(user) !== Boolean(pass)) {
      throw new ServiceUnavailableException(
        "La autenticación SMTP está incompleta.",
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: readBoolean(this.config.get<string>("SMTP_SECURE"), port === 465),
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    try {
      await transporter.sendMail({
        from:
          this.config.get<string>("EMAIL_FROM") ??
          "Wave CRM <no-reply@example.com>",
        to: recipient.email,
        subject: message.subject,
        text: `Hola ${recipient.name}, ${message.intro} ${url}. ${message.expiry}`,
        html: this.template(recipient.name, url, message),
      });
    } catch {
      throw new ServiceUnavailableException("No se pudo enviar el correo.");
    }
  }

  private template(name: string, url: string, message: Message) {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(url);
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#22221f">
      <h1 style="color:#2f6f8f">${message.heading}</h1>
      <p>Hola ${safeName},</p>
      <p>${message.intro} ${message.expiry}</p>
      <p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f6f8f;color:#fff;text-decoration:none;font-weight:700">${message.action}</a></p>
      <p style="color:#8f8e85;font-size:13px">${message.footer}</p>
    </div>`;
  }
}

function parsePort(value?: string) {
  const port = Number(value ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ServiceUnavailableException("El puerto SMTP no es válido.");
  }
  return port;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ServiceUnavailableException("SMTP_SECURE debe ser true o false.");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}
