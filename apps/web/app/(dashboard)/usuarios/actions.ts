"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";

export async function inviteUser(formData: FormData) {
  const result = await mutate("/users", "POST", {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    role: String(formData.get("role") ?? "VENDEDOR"),
  });
  finish(result, "Invitación enviada.");
}

export async function updateUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const result = await mutate(`/users/${encodeURIComponent(id)}`, "PATCH", {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    role: String(formData.get("role") ?? "VENDEDOR"),
  });
  finish(result, "Usuario actualizado.");
}

export async function deactivateUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  finish(
    await mutate(`/users/${encodeURIComponent(id)}/deactivate`, "PATCH"),
    "Usuario desactivado.",
  );
}

export async function reactivateUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  finish(
    await mutate(`/users/${encodeURIComponent(id)}/reactivate`, "PATCH"),
    "Usuario reactivado.",
  );
}

export async function resendInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  finish(
    await mutate(`/users/${encodeURIComponent(id)}/resend-invitation`, "POST"),
    "Invitación reenviada.",
  );
}

export async function deleteUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  finish(
    await mutate(`/users/${encodeURIComponent(id)}`, "DELETE"),
    "Usuario eliminado.",
  );
}

async function mutate(path: string, method: string, body?: object) {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return response.ok
      ? { ok: true as const }
      : { ok: false as const, message: await apiError(response) };
  } catch {
    return {
      ok: false as const,
      message: "No pudimos conectar con el servidor.",
    };
  }
}

function finish(
  result: { ok: boolean; message?: string },
  success: string,
): never {
  revalidatePath("/usuarios");
  const params = new URLSearchParams(
    result.ok ? { success } : { error: result.message ?? "Operación fallida." },
  );
  redirect(`/usuarios?${params.toString()}`);
}
