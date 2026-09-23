import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Crear contraseña nueva" };

type Props = Readonly<{ searchParams: Promise<{ token?: string }> }>;

export default async function RestablecerContrasenaPage({ searchParams }: Props) {
  const token = (await searchParams).token ?? "";
  const reset = await validateReset(token);

  if (!reset) {
    return (
      <div className="auth-box">
        <h1>Enlace no disponible</h1>
        <p className="auth-lead">
          El enlace no existe, venció o ya fue utilizado. Pide uno nuevo desde «¿Olvidaste tu
          contraseña?».
        </p>
        <Link className="auth-back" href="/recuperar-contrasena">
          <ArrowLeft aria-hidden />
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <h1>Crea tu contraseña nueva</h1>
      <p className="auth-lead">
        Hola <b>{reset.name}</b>. Al guardarla se cerrarán las sesiones abiertas de tu cuenta.
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
