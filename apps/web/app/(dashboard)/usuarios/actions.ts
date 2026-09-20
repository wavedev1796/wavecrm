"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import {
  emailError,
  fieldErrors,
  nameError,
  normalizeEmail,
  normalizeName,
  roleError,
} from "@/lib/validation";

export type Feedback = { tone: "success" | "error"; message: string };

export type UserFormValues = { name: string; email: string; role: string };

export type UserFormState = {
  feedback: Feedback | null;
  fieldErrors: Partial<Record<keyof UserFormValues, string>>;
  values: UserFormValues;
};

export async function inviteUser(
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const state = await submitUser(formData, "/users", "POST", "Invitación enviada.");
  // Tras invitar, el formulario queda vacío para la siguiente persona.
  return state.feedback?.tone === "success"
    ? { ...state, values: { name: "", email: "", role: "VENDEDOR" } }
    : state;
}

export async function updateUser(
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const id = String(formData.get("id") ?? "");
  return submitUser(formData, `/users/${encodeURIComponent(id)}`, "PATCH", "Usuario actualizado.");
}

export async function deactivateUser(formData: FormData) {
  return rowAction(formData, "/deactivate", "PATCH", "Usuario desactivado.");
}

export async function reactivateUser(formData: FormData) {
  return rowAction(formData, "/reactivate", "PATCH", "Usuario reactivado.");
}

export async function resendInvitation(formData: FormData) {
  return rowAction(formData, "/resend-invitation", "POST", "Invitación reenviada.");
}

export async function deleteUser(formData: FormData) {
  return rowAction(formData, "", "DELETE", "Usuario eliminado.");
}

async function submitUser(
  formData: FormData,
  path: string,
  method: string,
  success: string,
): Promise<UserFormState> {
  const values = {
    name: normalizeName(String(formData.get("name") ?? "")),
    email: normalizeEmail(String(formData.get("email") ?? "")),
    role: String(formData.get("role") ?? ""),
  };
  const invalid = fieldErrors({
    name: nameError(values.name),
    email: emailError(values.email),
    role: roleError(values.role),
  });
  if (invalid) return { feedback: null, fieldErrors: invalid, values };
  return { feedback: await mutate(path, method, success, values), fieldErrors: {}, values };
}

function rowAction(formData: FormData, suffix: string, method: string, success: string) {
  const id = String(formData.get("id") ?? "");
  return mutate(`/users/${encodeURIComponent(id)}${suffix}`, method, success);
}

async function mutate(
  path: string,
  method: string,
  success: string,
  body?: UserFormValues,
): Promise<Feedback> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) return { tone: "error", message: await apiError(response) };
  } catch (error) {
    // Una sesión vencida redirige al login desde authenticatedApi: no es un error de conexión.
    unstable_rethrow(error);
    return { tone: "error", message: "No pudimos conectar con el servidor. Inténtalo de nuevo." };
  }
  revalidatePath("/usuarios");
  return { tone: "success", message: success };
}
