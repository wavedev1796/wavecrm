"use client";

import { useState } from "react";
import { NewPasswordForm } from "@/components/new-password-form";
import { ACCESO } from "@/content/acceso";
import { activateAccount } from "./actions";
import { TermsConsent } from "./terms-consent";

export function ActivationForm({ token }: Readonly<{ token: string }>) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <NewPasswordForm
      token={token}
      action={activateAccount}
      submitLabel={ACCESO.activar.activar}
      pendingLabel={ACCESO.activar.activando}
      submitDisabled={!termsAccepted}
    >
      <TermsConsent accepted={termsAccepted} onAcceptedChange={setTermsAccepted} />
    </NewPasswordForm>
  );
}
