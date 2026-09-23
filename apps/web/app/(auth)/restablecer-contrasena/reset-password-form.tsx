"use client";

import { NewPasswordForm } from "@/components/new-password-form";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  return (
    <NewPasswordForm
      token={token}
      action={resetPassword}
      submitLabel="Guardar contraseña"
      pendingLabel="Guardando…"
    />
  );
}
