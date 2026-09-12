import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
    const apiKey = this.config.get<string>("RESEND_API_KEY");

    if (!apiKey) {
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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          this.config.get<string>("EMAIL_FROM") ??
          "Wave CRM <no-reply@example.com>",
        to: [recipient.email],
        subject: "Activa tu cuenta de Wave CRM",
        html: this.template(recipient.name, inviteUrl),
      }),
    });

    if (!response.ok) {
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
