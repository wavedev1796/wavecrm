import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string; sesion?: string }>;
}) {
  // Códigos fijos, nunca texto de la URL: nadie puede hacer que el login muestre un mensaje falso.
  const params = await searchParams;
  return (
    <div className="auth-box">
      <span className="auth-eyebrow">Bienvenido a Wave CRM</span>
      <h1>Inicia sesión en tu cuenta</h1>
      <p className="auth-lead">
        Continúa donde lo dejaste y mantén a tu equipo al día.
      </p>
      {params.activated === "1" && (
        <Alert tone="success">
          Tu cuenta fue activada. Ya puedes iniciar sesión.
        </Alert>
      )}
      {params.sesion === "expirada" && (
        <Alert tone="note">Tu sesión terminó. Vuelve a iniciar sesión.</Alert>
      )}
      <LoginForm />
    </div>
  );
}
