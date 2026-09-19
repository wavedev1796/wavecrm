import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "./api";
import { readSession, SESSION_EXPIRED_PATH } from "./session";

export async function authenticatedApi(path: string, init: RequestInit = {}) {
  const session = await readSession(await cookies());
  if (!session?.accessToken) redirect(SESSION_EXPIRED_PATH);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  // 401: el access token caducó o la cuenta se desactivó mientras la persona navegaba.
  if (response.status === 401) redirect(SESSION_EXPIRED_PATH);
  return response;
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
