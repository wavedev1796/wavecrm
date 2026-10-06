import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ACCESO } from "@/content/acceso";
import { API_URL } from "@/lib/api";
import { ActivationForm } from "./activation-form";

type Props = Readonly<{ searchParams: Promise<{ token?: string }> }>;

export default async function ActivateAccountPage({ searchParams }: Props) {
  const token = (await searchParams).token ?? "";
  const invitation = await validateInvitation(token);

  if (!invitation) {
    return (
      <div className="auth-box">
        <h1>{ACCESO.activar.noDisponible.encabezado}</h1>
        <p className="auth-lead">{ACCESO.activar.noDisponible.lead}</p>
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden />
          {ACCESO.volverAlLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <h1>{ACCESO.activar.encabezado}</h1>
      <p className="auth-lead">
        {ACCESO.activar.saludo}
        <b>{invitation.name}</b>
        {ACCESO.activar.cuenta}
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
