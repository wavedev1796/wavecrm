"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { apiError } from "@/lib/authenticated-api";
import { confirmationError, passwordError, type NewPasswordState } from "@/lib/password-rules";
import { fieldErrors, formText } from "@/lib/validation";

export async function resetPassword(
  _state: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
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
    response = await fetch(`${API_URL}/auth/password-resets/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, passwordConfirmation }),
      cache: "no-store",
    });
  } catch {
    return { error: "No pudimos conectar con el servidor. Inténtalo de nuevo.", fieldErrors: {} };
  }
  // 409: la contraseña repite una de las recordadas. Es un problema del campo, no del enlace.
  if (response.status === 409) {
    return { error: null, fieldErrors: { password: await apiError(response) } };
  }
  if (!response.ok) return { error: await apiError(response), fieldErrors: {} };
  // Código fijo, como el resto de avisos de /login: nunca texto libre en la URL.
  redirect("/login?contrasena=actualizada");
}
