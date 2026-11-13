import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import { readSession } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

async function authenticatedSession() {
  const session = await readSession(await cookies());
  return session?.accessToken ?? null;
}

function upstreamError(response: Response, payload: { error?: { message?: string | string[]; errors?: unknown } } | null) {
  const message = payload?.error?.message;
  return {
    error: Array.isArray(message) ? message.join(" ") : (message ?? "No se pudo cambiar la etapa."),
    status: response.status,
    ...(Array.isArray(payload?.error?.errors) && { pending: payload.error.errors }),
  };
}

/** Vista previa de requisitos: se consulta por HTTP desde el cliente para no depender del protocolo RSC de Server Actions. */
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const to = new URL(request.url).searchParams.get("to");
  if (!to)
    return NextResponse.json({ error: "Selecciona una etapa de destino." }, { status: 400 });

  const token = await authenticatedSession();
  if (!token)
    return NextResponse.json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });

  try {
    const response = await fetch(
      `${API_URL}/deals/${encodeURIComponent(id)}/transition?to=${encodeURIComponent(to)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string | string[]; errors?: unknown };
    } | null;

    if (!response.ok) {
      return NextResponse.json(upstreamError(response, payload), { status: response.status });
    }
    return NextResponse.json({ data: payload });
  } catch {
    return NextResponse.json(
      { error: "No pudimos conectar con el servidor. Intenta de nuevo." },
      { status: 502 },
    );
  }
}
