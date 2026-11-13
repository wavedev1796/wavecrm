import { afterEach, expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import {
  saveDeal,
  configurePipelineAction,
  saveDealItemsAction,
  deleteDealAction,
  deleteRejectedAction,
  dealHistoryAction,
  createActivityAction,
  completeActivityAction,
  previewTransitionAction,
  completeTransitionAction,
  saveTransitionAction,
  loadColumnAction,
  qualifyDealAction,
  createQuoteAction,
  addPaymentAction,
  deletePaymentAction,
  acceptQuoteAction,
} from "./actions";
import { emptyDeal } from "./types";
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "La referencia ya no existe.",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
/** Las reglas de fecha comparan con el día de Ecuador: se fija para que la prueba no caduque. */
const today = (day: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(day + "T17:00:00.000Z"));
};
afterEach(() => vi.useRealTimers());
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
    value: "520,25",
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
    form({ value: "1,001", contactId: "", expectedClose: "2026-02-31" }),
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
test("una fila vacía con IVA preseleccionado no envía el PUT al API", async () => {
  const result = await saveDealItemsAction("d1", [
    { description: "", quantity: "", unitPrice: "", taxRate: "15" },
  ]);
  expect(result.rowErrors?.[0]).toMatchObject({
    description: expect.any(String),
    quantity: expect.any(String),
    unitPrice: expect.any(String),
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
test("los productos viajan como numeros: el punto separa miles y la coma los centavos", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await saveDealItemsAction("d1", [
    { description: " Vinos ", quantity: "1,5", unitPrice: "1.100,25", taxRate: "0" },
  ]);
  expect(api).toHaveBeenCalledWith("/deals/d1/items", expect.objectContaining({ method: "PUT" }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({
    items: [{ description: "Vinos", quantity: 1.5, unitPrice: 1100.25, taxRate: 0 }],
  });
  api.mockClear();
  const result = await saveDealItemsAction("d1", [
    { description: "Vinos", quantity: "1", unitPrice: "100.25", taxRate: "0" },
  ]);
  expect(result.rowErrors?.[0]?.unitPrice).toBe(
    "Ingresa el precio con coma para los centavos, por ejemplo 1.400 o 19,99.",
  );
  expect(api).not.toHaveBeenCalled();
});
test("la observacion del movimiento se guarda como nota despues de mover, nunca antes", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  const moved = await completeTransitionAction("d1", "s2", "s1", fields({ observation: " Llamó \r\n\r\n\r\nel gerente " }));
  expect(moved).toEqual({ done: true });
  expect(calls()).toEqual([
    ["/deals/d1/move", "PATCH", { stageId: "s2", fromStageId: "s1" }],
    ["/deals/d1/notes", "POST", { content: "Llamó\n\nel gerente", mentionIds: [] }],
  ]);
  api.mockClear();
  // Demasiado larga: no se mueve nada.
  const long = await completeTransitionAction("d1", "s2", "s1", fields({ observation: "a".repeat(5001) }));
  expect(long.error).toBe("La observación admite hasta 5000 caracteres.");
  expect(api).not.toHaveBeenCalled();
  // La nota falla: el movimiento ya quedó y se avisa.
  api
    .mockResolvedValueOnce(Response.json({ id: "d1" }))
    .mockResolvedValueOnce(Response.json({ error: { message: "Sin acceso" } }, { status: 403 }));
  const warned = await completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: "NO_BUDGET", observation: "Sin fondos" }));
  expect(warned.done).toBe(true);
  expect(warned.warning).toMatch(/^El negocio cambió de etapa, pero la observación no se guardó: /);
});
test("ganar, perder y reabrir van a su ruta con la etapa vista y el dia a las 00:00 UTC", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await completeTransitionAction("d1", "WON", "s3", fields({ closedAt: "2026-10-10" }));
  await completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: "NEGOTIATION" }));
  await completeTransitionAction("d1", "REOPEN", "s4", fields({ reason: " El cliente anuló la orden " }));
  expect(calls()).toEqual([
    ["/deals/d1/win", "POST", { closedAt: "2026-10-10T00:00:00.000Z", fromStageId: "s3" }],
    ["/deals/d1/lose", "POST", { lossReason: "NEGOTIATION", fromStageId: "s1" }],
    ["/deals/d1/reopen", "POST", { reason: "El cliente anuló la orden" }],
  ]);
  expect((await completeTransitionAction("d1", "WON", "s3", fields({ closedAt: "10/10/2026" }))).error).toBeTruthy();
  expect(api).toHaveBeenCalledTimes(3);
});

test("completar una transicion encadena los datos y termina moviendo con la etapa vista", async () => {
  today("2026-10-20");
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
      requestKey: "8e2ce48b-55ad-4c71-8a0d-f237c753f4a4",
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
    // Las fechas de actividades viajan como día: el API las fija a las 00:00 de Ecuador (CRM-22).
    ["/deals/d1/activities", "POST", { type: "CALL", subject: "Primera llamada", completedAt: "2026-10-01" }],
    ["/deals/d1/activities", "POST", { type: "MEETING", subject: "Demo", dueAt: "2026-10-25" }],
    ["/deals/d1/quotes", "POST", { requestKey: "8e2ce48b-55ad-4c71-8a0d-f237c753f4a4", validUntil: "2026-11-30T00:00:00.000Z", sentAt: "2026-10-18T00:00:00.000Z" }],
    ["/deals/d1/quotes/q%201/accept", "POST", { acceptedAt: "2026-10-18T00:00:00.000Z", acceptanceNote: "Orden de compra" }],
    ["/deals/d1/move", "PATCH", { stageId: "s2", fromStageId: "s1", reason: "Revisar" }],
  ]);
});

test("rechazar va a su ruta; perder agenda el seguimiento solo si tiene asunto", async () => {
  today("2026-10-20");
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await completeTransitionAction("d1", "REJECTED", "s2", fields({ lossReason: "DO_NOT_CONTACT" }));
  await completeTransitionAction(
    "d1",
    "LOST",
    "s2",
    fields({ lossReason: "NEED_POSTPONED", followUpType: "CALL", followUpSubject: " Retomar ", followUpDay: "2027-01-18" }),
  );
  await completeTransitionAction("d1", "LOST", "s2", fields({ lossReason: "NO_BUDGET", followUpType: "CALL", followUpSubject: "", followUpDay: "2027-01-18" }));
  expect(calls()).toEqual([
    ["/deals/d1/reject", "POST", { lossReason: "DO_NOT_CONTACT", fromStageId: "s2" }],
    [
      "/deals/d1/lose",
      "POST",
      { lossReason: "NEED_POSTPONED", followUp: { type: "CALL", subject: "Retomar", dueAt: "2027-01-18" }, fromStageId: "s2" },
    ],
    ["/deals/d1/lose", "POST", { lossReason: "NO_BUDGET", fromStageId: "s2" }],
  ]);
});

test("cada dato pendiente es obligatorio y tiene su mensaje; nada llega al API", async () => {
  today("2026-10-20");
  const cases: [string, Record<string, string>, string][] = [
    ["s2", { contactId: "" }, "Elige el contacto del negocio."],
    ["s2", { interactionType: "CALL", interactionSubject: "", interactionDay: "2026-10-20" }, "Cuenta qué se habló con el cliente (entre 2 y 160 caracteres)."],
    ["s2", { interactionSubject: "Llamada", interactionDay: "2026-10-21" }, "Ingresa cuándo fue la interacción; no puede ser futura."],
    ["s2", { nextType: "CALL", nextSubject: "", nextDay: "2026-10-25" }, "Escribe el asunto de la próxima actividad (entre 2 y 160 caracteres)."],
    ["s2", { nextSubject: "Demo", nextDay: "2026-10-19" }, "Programa la próxima actividad para hoy o un día posterior."],
    ["s3", { budget: "", budgetNote: "" }, "Ingresa el presupuesto o explica por qué aún no se conoce (al menos 2 caracteres)."],
    ["s3", { validUntil: "", sentAt: "2026-10-20" }, "Ingresa hasta cuándo es válida la propuesta, de hoy en adelante."],
    ["s3", { validUntil: "2026-10-30", sentAt: "2026-10-21" }, "Ingresa cuándo se envió la propuesta; no puede ser futura."],
    ["WON", { acceptedAt: "2026-10-20", acceptanceNote: "" }, "Describe la evidencia de aceptación (entre 2 y 500 caracteres)."],
    ["REJECTED", { lossReason: "COMPETITOR" }, "Elige el motivo del rechazo."],
    ["LOST", { lossReason: "DO_NOT_CONTACT" }, "Elige el motivo de la pérdida."],
    ["LOST", { lossReason: "OTHER", followUpSubject: "Retomar", followUpDay: "2026-10-19" }, "El seguimiento debe ser de hoy en adelante."],
  ];
  for (const [to, values, message] of cases)
    expect([to, (await completeTransitionAction("d1", to, "s1", fields(values))).error]).toEqual([to, message]);
  expect(api).not.toHaveBeenCalled();
});

test("guardar sin mover registra lo llenado y no llama a mover", async () => {
  today("2026-10-20");
  api.mockResolvedValue(Response.json({ id: "d1" }));
  expect(await saveTransitionAction("d1", "s3", fields({ solution: " Portal ", budget: "", budgetNote: "Sin definir" }))).toEqual({ done: true });
  expect(calls()).toEqual([["/deals/d1", "PATCH", { solution: "Portal", budgetNote: "Sin definir" }]]);
  expect((await saveTransitionAction("d1", "s3", fields({ solution: "" }))).error).toBe(
    "Describe la solución de interés (entre 2 y 2000 caracteres).",
  );
  expect(api).toHaveBeenCalledTimes(1);
});

test("vaciar la papelera envía los ids y devuelve cuántos se eliminaron", async () => {
  api.mockResolvedValue(Response.json({ deleted: 2 }));
  expect(await deleteRejectedAction(["d1", "d2"])).toEqual({ data: { deleted: 2 } });
  expect(calls()).toEqual([["/deals/rejected/delete", "POST", { ids: ["d1", "d2"] }]]);
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
    { budget: "1,001" },
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
  await createQuoteAction("d1", fields({ validUntil: "2026-11-30", sentAt: "", requestKey: "8e2ce48b-55ad-4c71-8a0d-f237c753f4a4" }));
  await acceptQuoteAction("d1", "q1", fields({ acceptedAt: "2026-10-18", acceptanceNote: " Correo " }));
  expect(calls()).toEqual([
    ["/deals/d1/transition?to=s%202", "GET", undefined],
    ["/deals/board?pipelineId=p1&column=LOST&page=2", "GET", undefined],
    ["/deals/d1", "PATCH", { need: "Web", solution: null, budget: null, budgetNote: "Sin definir", decisionMaker: "Gerente", viable: null, viabilityNote: null }],
    ["/deals/d1/quotes", "POST", { requestKey: "8e2ce48b-55ad-4c71-8a0d-f237c753f4a4", validUntil: "2026-11-30T00:00:00.000Z" }],
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

test("el historial de un negocio ajeno avisa que no hay acceso; otro error pasa tal cual", async () => {
  api.mockResolvedValueOnce(new Response("", { status: 404 }));
  expect(await dealHistoryAction("d1")).toEqual({ error: "No tienes acceso al historial de este registro." });
  api.mockResolvedValueOnce(new Response("", { status: 500 }));
  expect(await dealHistoryAction("d1")).toEqual({ error: "La referencia ya no existe." });
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
    completeTransitionAction("d1", "LOST", "s1", fields({ lossReason: detail ? "OTHER" : "NEGOTIATION", lossDetail: detail }));
  expect((await lose("x".repeat(501))).error).toBeTruthy();
  await lose("");
  await lose("  Cambio de proveedor ");
  expect(calls().map(([, , body]) => body)).toEqual([
    { lossReason: "NEGOTIATION", fromStageId: "s1" },
    { lossReason: "OTHER", lossDetail: "Cambio de proveedor", fromStageId: "s1" },
  ]);
});

const activity = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const sent = (index = 0) => JSON.parse(String(api.mock.calls[index]?.[1]?.body));

test("una actividad invalida explica cada campo sin llamar al API", async () => {
  const result = await createActivityAction(
    "d1",
    activity({ type: "FAX", subject: "L", dueAt: "mañana", reminderAt: "x", description: "x".repeat(1001) }),
  );
  expect(result.ok).toBe(false);
  expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["description", "dueAt", "reminderAt", "subject", "type"]);
  expect(api).not.toHaveBeenCalled();
});

test("el recordatorio sigue las reglas de la agenda antes de llamar al API", async () => {
  const base = { type: "CALL", subject: "Llamar" };
  const error = async (values: Record<string, string>) =>
    (await createActivityAction("d1", activity({ ...base, ...values }))).fieldErrors?.reminderAt;
  expect(await error({ reminderAt: "2026-11-20T09:00" })).toBe(
    "Programa una fecha de vencimiento para activar el recordatorio.",
  );
  expect(await error({ dueAt: "2026-11-20T09:00", reminderAt: "2026-11-20T10:00" })).toBe(
    "El recordatorio debe ser anterior al vencimiento.",
  );
  expect(await error({ dueAt: "2026-11-20T09:00", reminderAt: "2026-11-20T08:00", done: "on" })).toBe(
    "Una actividad ya realizada no lleva recordatorio.",
  );
  expect(api).not.toHaveBeenCalled();
});

test("con responsable, hora y recordatorio, envia instantes de Ecuador a la ruta del negocio", async () => {
  api.mockResolvedValue(Response.json({ id: "a1" }));
  const result = await createActivityAction(
    "d1",
    activity({
      type: "MEETING",
      subject: " Demo ",
      assigneeId: "u2",
      dueAt: "2026-11-20T15:00",
      reminderAt: "2026-11-20T14:30",
      description: " Llevar \r\n\r\n\r\nla propuesta ",
    }),
  );
  expect(result).toEqual({ ok: true, message: "Actividad registrada." });
  expect(api).toHaveBeenCalledWith("/deals/d1/activities", expect.objectContaining({ method: "POST" }));
  expect(sent()).toEqual({
    type: "MEETING",
    subject: "Demo",
    assigneeId: "u2",
    description: "Llevar\n\nla propuesta",
    dueAt: "2026-11-20T20:00:00.000Z",
    reminderAt: "2026-11-20T19:30:00.000Z",
  });
});

test("una actividad ya realizada se envia completada en su fecha o ahora, sin vencimiento", async () => {
  api.mockResolvedValue(Response.json({ id: "a1" }));
  await createActivityAction("d1", activity({ type: "CALL", subject: "Llamada", dueAt: "2026-10-01T10:00", done: "on" }));
  expect(sent()).toEqual({ type: "CALL", subject: "Llamada", completedAt: "2026-10-01T15:00:00.000Z" });
  await createActivityAction("d1", activity({ type: "CALL", subject: "Llamada", done: "on" }));
  expect(Date.parse(sent(1).completedAt)).toBeLessThanOrEqual(Date.now());
  expect(sent(1).dueAt).toBeUndefined();
});

test("si el API rechaza la actividad, devuelve su mensaje", async () => {
  api.mockResolvedValue(new Response("", { status: 404 }));
  const result = await createActivityAction("d1", activity({ type: "CALL", subject: "Llamar" }));
  expect(result).toEqual({ ok: false, message: "La referencia ya no existe." });
});

test("la configuracion exige etapas con enteros, color por defecto y pipeline principal", async () => {
  api.mockResolvedValue(Response.json({ id: "p1" }));
  const stage = activity({ name: "Propuesta", position: "1.5", probability: "40" });
  expect((await configurePipelineAction("createStage", "p1", stage)).error).toMatch(/enteros/);

  const withRequirements = activity({ name: "Propuesta", position: "2", probability: "40" });
  withRequirements.append("requirements", "NEED");
  withRequirements.append("requirements", "BUDGET");
  await configurePipelineAction("createStage", "p1", withRequirements);
  const body = JSON.parse(String(api.mock.calls[0]?.[1]?.body));
  expect(body.color).toBe("#2f6f8f");
  expect(body.requirements).toEqual(["NEED", "BUDGET"]);

  await configurePipelineAction("createPipeline", "", activity({ name: "Ventas", isDefault: "true" }));
  expect(JSON.parse(String(api.mock.calls[1]?.[1]?.body))).toEqual({ name: "Ventas", isDefault: true });
});
test("sanitiza lo que escribe la persona: sin controles ni invisibles, con saltos de línea solo en las notas", async () => {
  api.mockResolvedValue(Response.json({ id: "deal-1" }));
  await saveDeal(initial, form({ title: " Con\u0000trato\u200B  anual\u202E " }));
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body)).title).toBe("Contrato anual");
  api.mockClear();
  await qualifyDealAction("d1", fields({ need: " Uno\r\n\r\n\r\n\u200BDos ", decisionMaker: "Ana\n\u0007 Paz" }));
  const body = JSON.parse(String(api.mock.calls[0]?.[1]?.body));
  expect(body.need).toBe("Uno\n\nDos");
  expect(body.decisionMaker).toBe("Ana Paz");
});
test("los productos limpian cada celda y lo que no es texto queda vacío", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await saveDealItemsAction("d1", [{ description: "Vi\u200Bnos\u0000  finos", quantity: "1", unitPrice: "10", taxRate: "15" }]);
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body)).items[0].description).toBe("Vinos finos");
  api.mockClear();
  const hostile = [{ description: { toString: () => "x" }, quantity: 5, unitPrice: null, taxRate: undefined }];
  const result = await saveDealItemsAction("d1", hostile as never);
  expect(result.rowErrors?.[0]).toEqual({
    description: expect.any(String),
    quantity: expect.any(String),
    unitPrice: expect.any(String),
    taxRate: expect.any(String),
  });
  expect(api).not.toHaveBeenCalled();
});

test("P4: la calificación guarda la viabilidad y exige evidencia de 10 caracteres o más", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  expect((await qualifyDealAction("d1", fields({ viable: "yes", viabilityNote: "Corto" }))).fieldErrors?.viabilityNote).toBeTruthy();
  await qualifyDealAction("d1", fields({ viable: "yes", viabilityNote: " Orden de compra firmada " }));
  await qualifyDealAction("d1", fields({ viable: "no", viabilityNote: "" }));
  expect(calls().map(([, , body]) => [body.viable, body.viabilityNote])).toEqual([
    [true, "Orden de compra firmada"],
    [false, null],
  ]);
});

test("P4 y P8: ganar guarda la viabilidad, envía el pago comprobado y con «No» no mueve nada", async () => {
  api.mockResolvedValue(Response.json({ id: "d1" }));
  const win = { closedAt: "2026-10-10", viable: "yes", viabilityNote: "Orden de compra 55", paymentConfirmed: "yes" };
  await completeTransitionAction("d1", "WON", "s3", fields(win));
  expect(calls()).toEqual([
    ["/deals/d1", "PATCH", { viable: true, viabilityNote: "Orden de compra 55" }],
    ["/deals/d1/win", "POST", { closedAt: "2026-10-10T00:00:00.000Z", paymentConfirmed: true, fromStageId: "s3" }],
  ]);
  expect((await completeTransitionAction("d1", "WON", "s3", fields({ ...win, paymentConfirmed: "no" }))).error).toBe(
    "Sin pago comprobado el negocio no se puede ganar.",
  );
  expect((await completeTransitionAction("d1", "WON", "s3", fields({ ...win, viable: "no" }))).error).toBe(
    "Para ganar, el negocio debe ser viable.",
  );
  expect((await completeTransitionAction("d1", "WON", "s3", fields({ ...win, viabilityNote: "Corta" }))).error).toMatch(/10 y 1000/);
  // Mover a la etapa de 100 % también lleva la respuesta.
  await completeTransitionAction("d1", "s4", "s3", fields({ closedAt: "2026-10-10", paymentConfirmed: "yes" }));
  expect(calls().at(-1)).toEqual([
    "/deals/d1/move",
    "PATCH",
    { stageId: "s4", fromStageId: "s3", closedAt: "2026-10-10T00:00:00.000Z", paymentConfirmed: true },
  ]);
  expect(api).toHaveBeenCalledTimes(3);
});

test("P6: el abono va en formato de Ecuador, con el día a las 00:00 UTC; borrar usa su ruta", async () => {
  today("2026-11-13");
  api.mockResolvedValue(Response.json({ id: "d1" }));
  await addPaymentAction("d1", fields({ amount: "1.250,50", paidAt: "2026-11-13", note: " Transferencia " }));
  await addPaymentAction("d1", fields({ amount: "80", paidAt: "2026-11-01", note: "" }));
  await deletePaymentAction("d1", "pay/1");
  expect(calls()).toEqual([
    ["/deals/d1/payments", "POST", { amount: 1250.5, paidAt: "2026-11-13T00:00:00.000Z", note: "Transferencia" }],
    ["/deals/d1/payments", "POST", { amount: 80, paidAt: "2026-11-01T00:00:00.000Z" }],
    ["/deals/d1/payments/pay%2F1", "DELETE", undefined],
  ]);
  const invalid = await addPaymentAction("d1", fields({ amount: "8.45", paidAt: "2026-11-14", note: "x" }));
  expect(Object.keys(invalid.fieldErrors ?? {})).toEqual(["amount", "paidAt", "note"]);
  expect((await addPaymentAction("d1", fields({ amount: "0", paidAt: "2026-11-13" }))).fieldErrors?.amount).toBeTruthy();
  expect(api).toHaveBeenCalledTimes(3);
});

test("P1: los días sin actividad de la etapa van como entero o null", async () => {
  api.mockResolvedValue(Response.json({ id: "s1" }));
  const stage = (staleDays: string) => fields({ name: "Propuesta", position: "2", probability: "40", staleDays });
  await configurePipelineAction("updateStage", "s1", stage("15"));
  await configurePipelineAction("updateStage", "s1", stage(""));
  expect(calls().map(([, , body]) => body.staleDays)).toEqual([15, null]);
  expect((await configurePipelineAction("updateStage", "s1", stage("400"))).error).toMatch(/entre 1 y 365/);
  expect((await configurePipelineAction("updateStage", "s1", stage("2,5"))).error).toMatch(/entre 1 y 365/);
  expect(api).toHaveBeenCalledTimes(2);
});
