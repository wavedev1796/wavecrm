import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { saveDeal, moveDealAction, configurePipelineAction } from "./actions";
import { emptyDeal } from "./types";
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "La referencia ya no existe.",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
const initial = { values: emptyDeal, fieldErrors: {} };
const form = (extra: Record<string, string> = {}) => {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    title: "Contrato",
    value: "520.25",
    pipelineId: "p1",
    stageId: "s1",
    contactId: "c1",
    expectedClose: "2026-10-22",
    ...extra,
  }))
    result.set(key, value);
  return result;
};
test("valida monto, vinculo y fecha antes de llamar al API", async () => {
  const result = await saveDeal(
    initial,
    form({ value: "1.001", contactId: "", expectedClose: "2026-02-31" }),
  );
  expect(result.fieldErrors).toEqual(
    expect.objectContaining({
      value: expect.any(String),
      contactId: expect.any(String),
      expectedClose: expect.any(String),
    }),
  );
  expect(api).not.toHaveBeenCalled();
});
test("envia monto numerico, fecha UTC y relaciones vacias como null", async () => {
  api.mockResolvedValue(Response.json({ id: "deal-1" }));
  const result = await saveDeal(initial, form({ value: "520,25" }));
  expect(result.savedId).toBe("deal-1");
  const body = JSON.parse(String(api.mock.calls[0]?.[1]?.body));
  expect(body.value).toBe(520.25);
  expect(body.expectedClose).toBe("2026-10-22T00:00:00.000Z");
  expect(body.companyId).toBeNull();
  expect(body.ownerId).toBeUndefined();
});
test("conserva los datos cuando el API rechaza el alta", async () => {
  api.mockResolvedValue(new Response("", { status: 409 }));
  const result = await saveDeal(initial, form());
  expect(result.feedback?.message).toBe("La referencia ya no existe.");
  expect(result.values.title).toBe("Contrato");
  expect(result.savedId).toBeUndefined();
});
test("explica una desconexion al mover en vez de dejar una promesa rechazada", async () => {
  api.mockRejectedValue(new Error("offline"));
  const result = await moveDealAction("d1", "s2");
  expect(result.error).toMatch(/conectar/);
});

test.each([
  ["createPipeline", "/pipelines", "POST"],
  ["updatePipeline", "/pipelines/p1", "PATCH"],
  ["deletePipeline", "/pipelines/p1", "DELETE"],
  ["createStage", "/pipelines/p1/stages", "POST"],
  ["updateStage", "/stages/p1", "PATCH"],
  ["deleteStage", "/stages/p1", "DELETE"],
] as const)(
  "%s conserva la ruta y el metodo HTTP",
  async (operation, path, method) => {
    api.mockResolvedValue(Response.json({ id: "p1" }));
    const data = new FormData();
    if (method !== "DELETE") {
      data.set("name", "Ventas");
      data.set("position", "1");
      data.set("probability", "50");
    }
    await configurePipelineAction(operation, "p1", data);
    expect(api).toHaveBeenCalledWith(path, expect.objectContaining({ method }));
    if (method === "DELETE")
      expect(api.mock.calls[0]?.[1]?.body).toBeUndefined();
  },
);

test("configuracion rechaza un archivo en el nombre sin convertirlo a texto", async () => {
  const data = new FormData();
  data.set("name", new File(["Ventas"], "nombre.txt"));
  const result = await configurePipelineAction("createPipeline", "", data);
  expect(result.error).toMatch(/nombre/);
  expect(api).not.toHaveBeenCalled();
});
