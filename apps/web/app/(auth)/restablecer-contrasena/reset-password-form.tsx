"use client";

import { NewPasswordForm } from "@/components/new-password-form";
import { ACCESO } from "@/content/acceso";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  return (
    <NewPasswordForm
      token={token}
      action={resetPassword}
      submitLabel={ACCESO.restablecer.guardar}
      pendingLabel={ACCESO.restablecer.guardando}
    />
  );
}
