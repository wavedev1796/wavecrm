"use client";

import { NewPasswordForm } from "@/components/new-password-form";
import { activateAccount } from "./actions";

export function ActivationForm({ token }: Readonly<{ token: string }>) {
  return (
    <NewPasswordForm
      token={token}
      action={activateAccount}
      submitLabel="Activar mi cuenta"
      pendingLabel="Activando…"
    />
  );
}
