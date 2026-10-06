import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ACCESO } from "@/content/acceso";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: ACCESO.login.titulo };

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ activated?: string; sesion?: string; contrasena?: string }>;
}>) {
  // Códigos fijos, nunca texto de la URL: nadie puede hacer que el login muestre un mensaje falso.
  const params = await searchParams;
  return (
    <div className="auth-box">
      <span className="auth-eyebrow">{ACCESO.login.eyebrow}</span>
      <h1>{ACCESO.login.encabezado}</h1>
      <p className="auth-lead">{ACCESO.login.lead}</p>
      {params.activated === "1" && (
        <Alert tone="success">{ACCESO.login.avisos.activada}</Alert>
      )}
      {params.contrasena === "actualizada" && (
        <Alert tone="success">
          {ACCESO.login.avisos.contrasenaActualizada}
        </Alert>
      )}
      {params.sesion === "expirada" && (
        <Alert tone="note">{ACCESO.login.avisos.sesionExpirada}</Alert>
      )}
      <LoginForm />
    </div>
  );
}
