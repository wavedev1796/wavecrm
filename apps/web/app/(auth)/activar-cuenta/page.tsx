import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { ActivationForm } from "./activation-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ActivateAccountPage({ searchParams }: Props) {
  const token = (await searchParams).token ?? "";
  const invitation = await validateInvitation(token);

  if (!invitation) {
    return (
      <div className="auth-box">
        <h1>Invitación no disponible</h1>
        <p className="auth-lead">
          El enlace no existe, venció o ya fue utilizado. Pide a un
          administrador que envíe una nueva invitación.
        </p>
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden />
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <h1>Activa tu cuenta</h1>
      <p className="auth-lead">
        Hola <b>{invitation.name}</b>. Crea una contraseña para la cuenta{" "}
        <b>{invitation.email}</b>.
      </p>
      <ActivationForm token={token} />
    </div>
  );
}

async function validateInvitation(token: string) {
  if (!token) return null;
  try {
    const response = await fetch(
      `${API_URL}/users/invitations/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    return response.ok
      ? ((await response.json()) as { name: string; email: string })
      : null;
  } catch {
    return null;
  }
}
