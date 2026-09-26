"use client";

import { useState } from "react";
import { NewPasswordForm } from "@/components/new-password-form";
import { activateAccount } from "./actions";
import { TermsConsent } from "./terms-consent";

export function ActivationForm({ token }: Readonly<{ token: string }>) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <NewPasswordForm
      token={token}
      action={activateAccount}
      submitLabel="Activar mi cuenta"
      pendingLabel="Activando…"
      submitDisabled={!termsAccepted}
    >
      <TermsConsent accepted={termsAccepted} onAcceptedChange={setTermsAccepted} />
    </NewPasswordForm>
  );
}
