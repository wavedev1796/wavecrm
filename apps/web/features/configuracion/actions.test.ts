import { afterEach, expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { saveSettingsAction } from "./actions";

vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "No tienes permiso.",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
afterEach(() => api.mockReset());
const form = (taxRate: string) => {
  const data = new FormData();
  data.set("taxRate", taxRate);
  return data;
};

test("envía el IVA como número al PATCH /settings", async () => {
  api.mockResolvedValue(Response.json({ taxRate: 8 }));
  expect(await saveSettingsAction({}, form("8"))).toEqual({ saved: true });
  expect(api.mock.calls[0]?.[0]).toBe("/settings");
  expect(api.mock.calls[0]?.[1]?.method).toBe("PATCH");
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({ taxRate: 8 });
});

test.each(["", "101", "1,5", "abc"])("un IVA inválido (%j) no llega al API", async (value) => {
  const result = await saveSettingsAction({}, form(value));
  expect(result.error).toBe("El IVA debe ser un porcentaje entero entre 0 y 100.");
  expect(api).not.toHaveBeenCalled();
});

test.each(["12", "14", "100"])("un IVA sin código de Billing (%j) no llega al API", async (value) => {
  const result = await saveSettingsAction({}, form(value));
  expect(result.error).toBe("Elige un IVA que Wave Billing acepte: 15, 8, 5 o 0.");
  expect(api).not.toHaveBeenCalled();
});

test("devuelve el error del API", async () => {
  api.mockResolvedValue(new Response("", { status: 403 }));
  expect(await saveSettingsAction({}, form("15"))).toEqual({ error: "No tienes permiso." });
});
