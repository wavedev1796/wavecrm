import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string }>;
}) {
  const activated = (await searchParams).activated === "1";
  return (
    <div className="auth-box">
      <span className="auth-eyebrow">Bienvenido a Wave CRM</span>
      <h1>Inicia sesión en tu cuenta</h1>
      <p className="auth-lead">
        Continúa donde lo dejaste y mantén a tu equipo al día.
      </p>
      {activated && (
        <Alert tone="success">
          Tu cuenta fue activada. Ya puedes iniciar sesión.
        </Alert>
      )}
      <LoginForm />
    </div>
  );
}
