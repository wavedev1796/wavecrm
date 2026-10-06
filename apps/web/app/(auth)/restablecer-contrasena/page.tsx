import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ACCESO } from "@/content/acceso";
import { API_URL } from "@/lib/api";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: ACCESO.restablecer.titulo };

type Props = Readonly<{ searchParams: Promise<{ token?: string }> }>;

export default async function RestablecerContrasenaPage({ searchParams }: Props) {
  const token = (await searchParams).token ?? "";
  const reset = await validateReset(token);

  if (!reset) {
    return (
      <div className="auth-box">
        <h1>{ACCESO.restablecer.noDisponible.encabezado}</h1>
        <p className="auth-lead">{ACCESO.restablecer.noDisponible.lead}</p>
        <Link className="auth-back" href="/recuperar-contrasena">
          <ArrowLeft aria-hidden />
          {ACCESO.restablecer.noDisponible.pedirOtro}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <h1>{ACCESO.restablecer.encabezado}</h1>
      <p className="auth-lead">
        {ACCESO.restablecer.saludo}
        <b>{reset.name}</b>
        {ACCESO.restablecer.aviso}
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}

async function validateReset(token: string) {
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/auth/password-resets/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as { name: string }) : null;
  } catch {
    return null;
  }
}
