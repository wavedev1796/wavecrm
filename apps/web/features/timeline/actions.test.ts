import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { loadTimeline } from "./actions";
import { apiPage, pendingCall } from "./timeline-fixture";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);

test("pide la página con el id y el cursor codificados y la devuelve armada", async () => {
  api.mockResolvedValue(Response.json(apiPage([pendingCall], "c/2")));
  const result = await loadTimeline("deals", "d 1", "a+b=");
  expect(api).toHaveBeenCalledWith("/deals/d%201/timeline?cursor=a%2Bb%3D");
  expect(result).toMatchObject({ nextCursor: "c/2", entries: [{ id: "ACTIVITY:a1", title: "Llamar a Maria" }] });
  await loadTimeline("contacts", "c1");
  expect(api).toHaveBeenLastCalledWith("/contacts/c1/timeline");
});

test("un 404 es falta de acceso; otro error, un fallo de carga; sin conexión, el aviso de conexión", async () => {
  api.mockResolvedValueOnce(new Response(null, { status: 404 }));
  expect(await loadTimeline("contacts", "c1")).toEqual({
    error: "No tienes acceso al historial de este registro.",
    forbidden: true,
  });
  api.mockResolvedValueOnce(new Response(null, { status: 400 }));
  expect(await loadTimeline("contacts", "c1", "roto")).toEqual({ error: "No pudimos cargar el historial." });
  api.mockRejectedValueOnce(new Error("fetch failed"));
  expect(await loadTimeline("contacts", "c1")).toEqual({
    error: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  });
});

test("rechaza rutas que no son de negocio o contacto sin llamar al API", async () => {
  expect(await loadTimeline("users" as never, "u1")).toEqual({ error: "No pudimos cargar el historial." });
  expect(await loadTimeline("deals", 5 as never)).toEqual({ error: "No pudimos cargar el historial." });
  expect(api).not.toHaveBeenCalled();
});
