"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { apiError } from "@/lib/authenticated-api";
import { confirmationError, passwordError } from "@/lib/password-rules";
import { fieldErrors, formText } from "@/lib/validation";

export type ActivationState = {
  error: string | null;
  fieldErrors: { password?: string; passwordConfirmation?: string };
};

export async function activateAccount(
  _state: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const token = formText(formData, "token");
  const password = formText(formData, "password");
  const passwordConfirmation = formText(formData, "passwordConfirmation");
  const invalid = fieldErrors({
    password: passwordError(password),
    passwordConfirmation: confirmationError(password, passwordConfirmation),
  });
  if (invalid) return { error: null, fieldErrors: invalid };

  let response: Response;
  try {
    response = await fetch(
      `${API_URL}/users/invitations/${encodeURIComponent(token)}/activate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation }),
        cache: "no-store",
      },
    );
  } catch {
    return { error: "No pudimos conectar con el servidor. Inténtalo de nuevo.", fieldErrors: {} };
  }
  if (!response.ok) return { error: await apiError(response), fieldErrors: {} };
  redirect("/login?activated=1");
}
