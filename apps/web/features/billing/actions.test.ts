import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { emailBillingAction, refreshBillingAction, reissueBillingAction, sendBillingAction } from "./actions";

vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "Wave Billing no encontró la factura.",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const calls = () => api.mock.calls.map(([path, init]) => [path, init?.method, init?.body && JSON.parse(String(init.body))]);

test("cada acción llama a su ruta con el cuerpo del API y devuelve la entrega actualizada", async () => {
  api.mockImplementation(async () => Response.json({ id: "h1", status: "SENT" }));
  const sent = await sendBillingAction("d/1", form({ buyer: "COMPANY", paymentMethod: "20" }));
  await refreshBillingAction("d1");
  await reissueBillingAction("d1", form({ buyer: "CONTACT" }));
  await emailBillingAction("d1", form({ email: " ana@acme.ec " }));
  await emailBillingAction("d1", form({ email: "" }));
  expect(sent.handoff).toMatchObject({ id: "h1" });
  expect(calls()).toEqual([
    ["/deals/d%2F1/billing", "POST", { buyer: "COMPANY", paymentMethod: "20" }],
    ["/deals/d1/billing/refresh", "POST", {}],
    ["/deals/d1/billing/reissue", "POST", { buyer: "CONTACT" }],
    ["/deals/d1/billing/email", "POST", { email: "ana@acme.ec" }],
    ["/deals/d1/billing/email", "POST", {}],
  ]);
});

test("un comprador o forma de pago que no es un código no llega al API; un error del API vuelve como error", async () => {
  api.mockClear();
  expect((await sendBillingAction("d1", form({ buyer: "NADIE", paymentMethod: "20" }))).error).toBeTruthy();
  expect((await sendBillingAction("d1", form({ buyer: "COMPANY", paymentMethod: "99" }))).error).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
  api.mockResolvedValue(new Response("{}", { status: 404 }));
  expect(await refreshBillingAction("d1")).toEqual({ error: "Wave Billing no encontró la factura." });
});
