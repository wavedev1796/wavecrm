import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
import { authenticatedApi } from "@/lib/authenticated-api";
import { GET } from "./route";

vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "Esta venta no tiene factura.",
}));
const api = vi.mocked(authenticatedApi);
const get = (id: string, file: string) => GET(new Request("http://localhost/x"), { params: Promise.resolve({ id, file }) });

test("ride devuelve el cuerpo con solo el tipo y la disposición del API", async () => {
  api.mockResolvedValue(
    new Response("%PDF-1.4", {
      headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="k.pdf"', "set-cookie": "a=b", "x-secret": "1" },
    }),
  );
  const response = await get("d/1", "ride");
  expect(api).toHaveBeenCalledWith("/deals/d%2F1/billing/ride");
  expect(await response.text()).toBe("%PDF-1.4");
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toBe('inline; filename="k.pdf"');
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("x-secret")).toBeNull();
});

test("un archivo que no es ride ni xml es 404 sin llamar al API", async () => {
  api.mockClear();
  const response = await get("d1", "otro");
  expect(response.status).toBe(404);
  expect(api).not.toHaveBeenCalled();
});

test("un error del API sale como JSON con su estado y mensaje", async () => {
  api.mockResolvedValue(new Response("{}", { status: 409 }));
  const response = await get("d1", "xml");
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "Esta venta no tiene factura." });
});

test("si el API no responde, 502 con el mensaje de conexión", async () => {
  api.mockRejectedValue(new Error("ECONNREFUSED"));
  const response = await get("d1", "ride");
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "No pudimos conectar con el servidor. Tus datos se conservan; intenta de nuevo." });
});
