import type { Metadata } from "next";
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
      <h1>Inicia sesión</h1>
      <p>Ingresa con tu cuenta del equipo.</p>
      {activated && (
        <p className="auth-success">
          Tu cuenta fue activada. Ya puedes iniciar sesión.
        </p>
      )}
      <LoginForm />
    </div>
  );
}
