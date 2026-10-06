"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { ACCESO } from "@/content/acceso";
import { COMUN } from "@/content/comun";
import { apiError } from "@/lib/authenticated-api";
import { confirmationError, passwordError, type NewPasswordState } from "@/lib/password-rules";
import { fieldErrors, formText } from "@/lib/validation";

export type ActivationState = NewPasswordState;

export async function activateAccount(
  _state: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const token = formText(formData, "token");
  const password = formText(formData, "password");
  const passwordConfirmation = formText(formData, "passwordConfirmation");
  const termsAccepted = formText(formData, "termsAccepted") === "true";
  const invalid = fieldErrors({
    password: passwordError(password),
    passwordConfirmation: confirmationError(password, passwordConfirmation),
  });
  if (invalid) return { error: null, fieldErrors: invalid };
  if (!termsAccepted) {
    return {
      error: ACCESO.activar.terminosObligatorios,
      fieldErrors: {},
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_URL}/users/invitations/${encodeURIComponent(token)}/activate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation, termsAccepted }),
        cache: "no-store",
      },
    );
  } catch {
    return { error: COMUN.errores.conexion, fieldErrors: {} };
  }
  if (!response.ok) return { error: await apiError(response), fieldErrors: {} };
  redirect("/login?activated=1");
}
