import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import {
  saveDeal,
  configurePipelineAction,
  saveDealItemsAction,
  deleteDealAction,
  dealHistoryAction,
  createActivityAction,
  completeActivityAction,
  previewTransitionAction,
  completeTransitionAction,
  loadColumnAction,
  qualifyDealAction,
  createQuoteAction,
  acceptQuoteAction,
} from "./actions";
import { emptyActivity, emptyDeal } from "./types";
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "La referencia ya no existe.",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
const initial = { values: emptyDeal, fieldErrors: {} };
const fields = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
/** Ruta, método y cuerpo de cada llamada al API, en orden. */
const calls = () =>
  api.mock.calls.map(([path, init]) => [path, init?.method, init?.body ? JSON.parse(String(init.body)) : undefined]);
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
  const result = await completeTransitionAction("d1", "s2", "s1", new FormData());
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

test("el formulario ya no envia estado y omite el monto calculado por productos", async () => {
  api.mockResolvedValue(Response.json({ id: "deal-1" }));
  await saveDeal(initial, form({ id: "deal-1", valueLocked: "1" }));
  const body = JSON.parse(String(api.mock.calls[0]?.[1]?.body));
  expect(body).not.toHaveProperty("status");
  expect(body).not.toHaveProperty("value");
});
test("los productos se validan por fila antes de llamar al API", async () => {
  const result = await saveDealItemsAction("d1", [
    { description: "W", quantity: "0", unitPrice: "1,005", taxRate: "101" },
  ]);
  expect(result.rowErrors?.[0]).toEqual({
    description: expect.any(String),
    quantity: expect.any(String),
    unitPrice: expect.any(String),
    taxRate: "Ingresa un IVA entero entre 0 y 100.",
  });
  expect(api).not.toHaveBeenCalled();
});
test("el IVA es editable: acepta 12 y rechaza decimales o vacio", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  const row = { description: "Web", quantity: "1", unitPrice: "10" };
  for (const taxRate of ["12,5", ""])
    expect((await saveDealItemsAction("d1", [{ ...row, taxRate }])).rowErrors?.[0]?.taxRate).toBe(
      "Ingresa un IVA entero entre 0 y 100.",
    );
  await saveDealItemsAction("d1", [{ ...row, taxRate: "12" }]);
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body)).items[0].taxRate).toBe(12);
});
test("los productos viajan como numeros con coma o punto decimal", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await saveDealItemsAction("d1", [
    { description: " Vinos ", quantity: "1,5", unitPrice: "100.25", taxRate: "0" },
  ]);
  expect(api).toHaveBeenCalledWith("/deals/d1/items", expect.objectContaining({ method: "PUT" }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({
    items: [{ description: "Vinos", quantity: 1.5, unitPrice: 100.25, taxRate: 0 }],
  });
});
test("ganar, perder y reabrir van a su ruta con la etapa vista y el dia a las 00:00 UTC", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await completeTransitionAction("d1", "WON", "s3", fields({ closedAt: "2026-10-10" }));
  await completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: "PRICE" }));
  await completeTransitionAction("d1", "REOPEN", "s4", fields({ reason: " El cliente anuló la orden " }));
  expect(calls()).toEqual([
    ["/deals/d1/win", "POST", { closedAt: "2026-10-10T00:00:00.000Z", fromStageId: "s3" }],
    ["/deals/d1/lose", "POST", { lossReason: "PRICE", fromStageId: "s1" }],
    ["/deals/d1/reopen", "POST", { reason: "El cliente anuló la orden" }],
  ]);
  expect((await completeTransitionAction("d1", "WON", "s3", fields({ closedAt: "10/10/2026" }))).error).toBeTruthy();
  expect(api).toHaveBeenCalledTimes(3);
});

test("completar una transicion encadena los datos y termina moviendo con la etapa vista", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  const result = await completeTransitionAction(
    "d1",
    "s2",
    "s1",
    fields({
      contactId: "c1",
      need: " Tienda en línea ",
      budget: "5000,50",
      expectedClose: "2026-11-30",
      interactionType: "CALL",
      interactionSubject: "Primera llamada",
      interactionDay: "2026-10-01",
      nextType: "MEETING",
      nextSubject: "Demo",
      nextDay: "2026-10-25",
      validUntil: "2026-11-30",
      sentAt: "2026-10-18",
      quoteId: "q 1",
      acceptedAt: "2026-10-18",
      acceptanceNote: "Orden de compra",
      reason: "Revisar",
    }),
  );
  expect(result).toEqual({ done: true });
  expect(calls()).toEqual([
    [
      "/deals/d1",
      "PATCH",
      { contactId: "c1", need: "Tienda en línea", budget: 5000.5, expectedClose: "2026-11-30T00:00:00.000Z" },
    ],
    ["/deals/d1/activities", "POST", { type: "CALL", subject: "Primera llamada", completedAt: "2026-10-01T00:00:00.000Z" }],
    ["/deals/d1/activities", "POST", { type: "MEETING", subject: "Demo", dueAt: "2026-10-25T00:00:00.000Z" }],
    ["/deals/d1/quotes", "POST", { validUntil: "2026-11-30T00:00:00.000Z", sentAt: "2026-10-18T00:00:00.000Z" }],
    ["/deals/d1/quotes/q%201/accept", "POST", { acceptedAt: "2026-10-18T00:00:00.000Z", acceptanceNote: "Orden de compra" }],
    ["/deals/d1/move", "PATCH", { stageId: "s2", fromStageId: "s1", reason: "Revisar" }],
  ]);
});

test("un 422 devuelve los pendientes y un paso previo que falla corta la cadena", async () => {
  const pending = [{ code: "NEED", message: "Documenta la necesidad del cliente." }];
  api.mockResolvedValueOnce(Response.json({ error: { message: "Faltan datos.", errors: pending } }, { status: 422 }));
  expect(await completeTransitionAction("d1", "s2", "s1", new FormData())).toEqual({
    error: "La referencia ya no existe.",
    pending,
  });
  api.mockResolvedValueOnce(new Response("", { status: 400 }));
  const result = await completeTransitionAction("d1", "s2", "s1", fields({ need: "Web" }));
  expect(result.error).toBe("La referencia ya no existe.");
  expect(api).toHaveBeenCalledTimes(2);
});

test("la transicion valida fechas, presupuesto y motivos antes de llamar al API", async () => {
  for (const values of [
    { budget: "1.001" },
    { nextDay: "2026-02-31", nextSubject: "Demo", nextType: "CALL" },
    { reason: "x" },
  ] as Record<string, string>[])
    expect((await completeTransitionAction("d1", "s2", "s1", fields(values))).error).toBeTruthy();
  expect((await completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: "OTHER" }))).error).toMatch(/motivo/);
  expect((await completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: "CAPRICHO" }))).error).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});

test("la consulta previa, ver mas y la ficha usan sus rutas", async () => {
  api.mockResolvedValue(Response.json({ pending: [], quote: null, items: 0 }));
  expect((await previewTransitionAction("d1", "s 2")).data).toEqual({ pending: [], quote: null, items: 0 });
  await loadColumnAction("p1", "LOST", 2);
  await qualifyDealAction("d1", fields({ need: " Web ", solution: "", budget: "", budgetNote: "Sin definir", decisionMaker: "Gerente" }));
  await createQuoteAction("d1", fields({ validUntil: "2026-11-30", sentAt: "" }));
  await acceptQuoteAction("d1", "q1", fields({ acceptedAt: "2026-10-18", acceptanceNote: " Correo " }));
  expect(calls()).toEqual([
    ["/deals/d1/transition?to=s%202", "GET", undefined],
    ["/deals/board?pipelineId=p1&column=LOST&page=2", "GET", undefined],
    ["/deals/d1", "PATCH", { need: "Web", solution: null, budget: null, budgetNote: "Sin definir", decisionMaker: "Gerente" }],
    ["/deals/d1/quotes", "POST", { validUntil: "2026-11-30T00:00:00.000Z" }],
    ["/deals/d1/quotes/q1/accept", "POST", { acceptedAt: "2026-10-18T00:00:00.000Z", acceptanceNote: "Correo" }],
  ]);
  expect((await qualifyDealAction("d1", fields({ budget: "abc" }))).fieldErrors?.budget).toBeTruthy();
  expect((await createQuoteAction("d1", fields({ validUntil: "" }))).error).toBeTruthy();
  expect((await acceptQuoteAction("d1", "q1", fields({ acceptedAt: "2026-10-18", acceptanceNote: "" }))).error).toBeTruthy();
  expect(api).toHaveBeenCalledTimes(5);
});

test("borrar, reabrir y completar usan su ruta y un 204 no trae datos", async () => {
  api.mockImplementation(async () => new Response(null, { status: 204 }));
  expect(await deleteDealAction("d 1")).toEqual({ data: undefined });
  await completeActivityAction("d1", "a/1");
  expect(api.mock.calls.map(([path, init]) => [path, init?.method])).toEqual([
    ["/deals/d%201", "DELETE"],
    ["/deals/d1/activities/a%2F1/complete", "PATCH"],
  ]);
});

test("el historial es un GET que tolera un cuerpo que no es JSON", async () => {
  api.mockResolvedValue(new Response("no json", { status: 200 }));
  expect(await dealHistoryAction("d1")).toEqual({ data: undefined });
  expect(api).toHaveBeenCalledWith("/deals/d1/history", { method: "GET" });
});

test("editar un negocio usa PATCH, envia el responsable y avisa que se actualizo", async () => {
  api.mockResolvedValue(Response.json({ id: "deal-1" }));
  const result = await saveDeal(
    initial,
    form({ id: "deal-1", ownerId: "u1", companyId: "co1", expectedClose: "" }),
  );
  expect(api).toHaveBeenCalledWith("/deals/deal-1", expect.objectContaining({ method: "PATCH" }));
  const body = JSON.parse(String(api.mock.calls[0]?.[1]?.body));
  expect(body).toMatchObject({ ownerId: "u1", companyId: "co1", expectedClose: null });
  expect(result.feedback).toEqual({ tone: "success", message: expect.any(String) });
});

test("perder valida el largo del detalle y lo envia recortado", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  const lose = (detail: string) =>
    completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: detail ? "OTHER" : "PRICE", lossDetail: detail }));
  expect((await lose("x".repeat(501))).error).toBeTruthy();
  await lose("");
  await lose("  Cambio de proveedor ");
  expect(calls().map(([, , body]) => body)).toEqual([
    { lossReason: "PRICE", fromStageId: "s1" },
    { lossReason: "OTHER", lossDetail: "Cambio de proveedor", fromStageId: "s1" },
  ]);
});

const activity = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const activityState = { values: emptyActivity, fieldErrors: {} };

test("una actividad invalida explica cada campo sin llamar al API", async () => {
  const result = await createActivityAction(
    "d1",
    activityState,
    activity({ type: "FAX", subject: "L", dueAt: "mañana", description: "x".repeat(1001) }),
  );
  expect(Object.keys(result.fieldErrors).sort()).toEqual(["description", "dueAt", "subject", "type"]);
  expect(api).not.toHaveBeenCalled();
});

test("una actividad ya realizada se envia como completada en su fecha o en la de hoy", async () => {
  api.mockResolvedValue(Response.json({ id: "a1" }));
  await createActivityAction("d1", activityState, activity({ type: "CALL", subject: "Llamada", dueAt: "2026-10-01", done: "on" }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({
    type: "CALL",
    subject: "Llamada",
    completedAt: "2026-10-01T00:00:00.000Z",
  });
  await createActivityAction("d1", activityState, activity({ type: "CALL", subject: "Llamada", done: "on" }));
  expect(JSON.parse(String(api.mock.calls[1]?.[1]?.body)).completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/);
});

test("registrar una actividad limpia el formulario y omite fecha y nota vacias", async () => {
  api.mockResolvedValue(Response.json({ id: "a1" }));
  const result = await createActivityAction("d1", activityState, activity({ type: "CALL", subject: " Llamar " }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({ type: "CALL", subject: "Llamar" });
  expect(result.values).toEqual(emptyActivity);
  expect(result.feedback?.tone).toBe("success");

  await createActivityAction(
    "d1",
    activityState,
    activity({ type: "TASK", subject: "Enviar", dueAt: "2026-10-20", description: "Nota" }),
  );
  expect(JSON.parse(String(api.mock.calls[1]?.[1]?.body))).toEqual({
    type: "TASK",
    subject: "Enviar",
    dueAt: "2026-10-20T00:00:00.000Z",
    description: "Nota",
  });
});

test("si el API rechaza la actividad, conserva lo escrito", async () => {
  api.mockResolvedValue(new Response("", { status: 404 }));
  const result = await createActivityAction("d1", activityState, activity({ type: "CALL", subject: "Llamar" }));
  expect(result.feedback).toEqual({ tone: "error", message: "La referencia ya no existe." });
  expect(result.values.subject).toBe("Llamar");
});

test("la configuracion exige etapas con enteros, color por defecto y pipeline principal", async () => {
  api.mockResolvedValue(Response.json({ id: "p1" }));
  const stage = activity({ name: "Propuesta", position: "1.5", probability: "40" });
  expect((await configurePipelineAction("createStage", "p1", stage)).error).toMatch(/enteros/);

  await configurePipelineAction("createStage", "p1", activity({ name: "Propuesta", position: "2", probability: "40" }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body)).color).toBe("#2f6f8f");

  await configurePipelineAction("createPipeline", "", activity({ name: "Ventas", isDefault: "true" }));
  expect(JSON.parse(String(api.mock.calls[1]?.[1]?.body))).toEqual({ name: "Ventas", isDefault: true });
});
