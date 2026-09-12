import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "./api";
import { readSession } from "./session";

export async function authenticatedApi(path: string, init: RequestInit = {}) {
  const session = await readSession(await cookies());
  if (!session?.accessToken) throw new Error("Sesión no disponible.");
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
}

export async function apiError(response: Response) {
  const fallback = "No pudimos completar la operación.";
  try {
    const body = (await response.json()) as {
      error?: { message?: string | string[] };
    };
    const message = body.error?.message;
    return Array.isArray(message) ? message.join(" ") : (message ?? fallback);
  } catch {
    return fallback;
  }
}
