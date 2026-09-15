import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

@Injectable()
export class InvitationMailerService {
  constructor(private readonly config: ConfigService) {}

  async sendInvitation(
    recipient: { email: string; name: string },
    token: string,
  ) {
    const appUrl =
      this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    const inviteUrl = `${appUrl.replace(/\/$/, "")}/activar-cuenta?token=${encodeURIComponent(token)}`;
    const smtpHost = this.config.get<string>("SMTP_HOST")?.trim();

    if (!smtpHost) {
      if (this.config.get<string>("NODE_ENV") === "production") {
        throw new ServiceUnavailableException(
          "El servicio de correo no está configurado.",
        );
      }
      console.info(
        `[Wave CRM] Invitación para ${recipient.email}: ${inviteUrl}`,
      );
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
        subject: "Activa tu cuenta de Wave CRM",
        text: `Hola ${recipient.name}, activa tu cuenta de Wave CRM: ${inviteUrl}. El enlace vence en 48 horas.`,
        html: this.template(recipient.name, inviteUrl),
      });
    } catch {
      throw new ServiceUnavailableException(
        "No se pudo enviar la invitación por correo.",
      );
    }
  }

  private template(name: string, inviteUrl: string) {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(inviteUrl);
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#22221f">
      <h1 style="color:#2f6f8f">Te invitaron a Wave CRM</h1>
      <p>Hola ${safeName},</p>
      <p>Activa tu cuenta y crea tu contraseña. El enlace vence en 48 horas.</p>
      <p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f6f8f;color:#fff;text-decoration:none;font-weight:700">Activar mi cuenta</a></p>
      <p style="color:#8f8e85;font-size:13px">Si no esperabas esta invitación, puedes ignorar este correo.</p>
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
