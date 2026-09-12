"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";

export type ActivationState = { error: string | null };

export async function activateAccount(
  _state: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );
  if (password !== passwordConfirmation)
    return { error: "Las contraseñas no coinciden." };

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
    return {
      error: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
    };
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string | string[] };
    } | null;
    const message = body?.error?.message;
    return {
      error: Array.isArray(message)
        ? message.join(" ")
        : (message ?? "No pudimos activar la cuenta."),
    };
  }
  redirect("/login?activated=1");
}
