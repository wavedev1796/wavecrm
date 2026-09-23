import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/api";
import { clearSession, readSession, SESSION_EXPIRED_PATH, writeSession } from "@/lib/session";

const PUBLIC_PATHS = new Set([
  "/login",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/activar-cuenta",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request.cookies);

  if (!session) {
    return PUBLIC_PATHS.has(pathname)
      ? NextResponse.next()
      : redirectTo("/login", request);
  }
  if (session.accessToken) {
    if (await accessTokenIsActive(session.accessToken)) {
      return pathname === "/login"
        ? redirectTo("/pipeline", request)
        : NextResponse.next();
    }
    return endSession(request);
  }

  const tokens = await refreshTokens(session.refreshToken);
  if (!tokens) return endSession(request);
  // Propaga los tokens también a esta misma petición para que los Server Components
  // puedan llamar al API durante la navegación que acaba de renovar la sesión.
  request.cookies.set("wave_access", tokens.accessToken);
  request.cookies.set("wave_refresh", tokens.refreshToken);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", request.cookies.toString());
  const response =
    pathname === "/login"
      ? redirectTo("/pipeline", request)
      : NextResponse.next({ request: { headers: requestHeaders } });
  await writeSession(response.cookies, tokens.accessToken, tokens.refreshToken);
  return response;
}

type Tokens = { accessToken: string; refreshToken: string };

async function accessTokenIsActive(accessToken: string) {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// El refresh rota el token: si dos peticiones con el access vencido renovaran por separado
// (pasar el ratón sobre un enlace y hacer clic), la segunda usaría un token ya rotado y
// cerraría la sesión. Las renovaciones con el mismo refresh comparten una sola llamada y su
// resultado se reutiliza unos segundos, para las peticiones que salieron antes de que el
// navegador recibiera las cookies nuevas.
// ponytail: memoria del proceso, válido con una instancia; con varias hace falta un lock
// compartido (Redis). Next además quita al middleware la cabecera de prefetch, así que no
// se puede distinguir un prefetch de una navegación.
const REFRESH_REUSE_MS = 10_000;
const refreshes = new Map<string, Promise<Tokens | null>>();

function refreshTokens(refreshToken: string) {
  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = requestRefresh(refreshToken);
    refreshes.set(refreshToken, pending);
    setTimeout(() => refreshes.delete(refreshToken), REFRESH_REUSE_MS);
  }
  return pending;
}

async function requestRefresh(refreshToken: string): Promise<Tokens | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as Tokens) : null;
  } catch {
    return null;
  }
}

/** La sesión dejó de servir (cuenta desactivada, refresh vencido o revocado): se borra y se avisa en /login. */
async function endSession(request: NextRequest) {
  const response = redirectTo(SESSION_EXPIRED_PATH, request);
  await clearSession(response.cookies);
  return response;
}

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const config = {
  // Todo menos los assets de Next y los archivos de public/ (rutas con punto). El punto va
  // como [.] porque Next elimina las barras invertidas del matcher: `\.` acabaría siendo
  // "cualquier carácter" y el middleware dejaría de ejecutarse en casi todas las rutas.
  matcher: ["/((?!_next/static|_next/image|.*[.]).*)"],
};
