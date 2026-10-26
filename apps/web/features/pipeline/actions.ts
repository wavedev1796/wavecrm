"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import { ACTIVITY_TYPES, LOSS_REASONS, REJECTION_REASONS } from "@wave/shared";
import { NEGOCIO, PIPELINE, TRANSICION } from "@/content/pipeline";
import {
  decimal,
  isAmount,
  isDay,
  todayEcuador,
  validateDeal,
  validateItems,
} from "./deal-validation";
import {
  emptyActivity,
  emptyDeal,
  type ActivityFormState,
  type ActivityValues,
  type Deal,
  type DealFormState,
  type DealValues,
  type HistoryItem,
  type ItemErrors,
  type ItemValues,
  type Pending,
  type Preview,
} from "./types";

const dealPath = (id: string, rest = "") =>
  "/deals/" + encodeURIComponent(id) + rest;

function refresh() {
  for (const path of ["/pipeline", "/contactos", "/empresas"])
    revalidatePath(path, "layout");
}
function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ error?: string; data?: unknown; pending?: Pending[] }> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      // Un 422 de una transición trae la lista de pendientes junto al mensaje.
      const body = (await response
        .clone()
        .json()
        .catch(() => null)) as { error?: { errors?: unknown } } | null;
      const pending = body?.error?.errors;
      return {
        error: await apiError(response),
        ...(Array.isArray(pending) && { pending: pending as Pending[] }),
      };
    }
    const data: unknown =
      response.status === 204
        ? undefined
        : await response.json().catch(() => undefined);
    if (method !== "GET") refresh();
    return { data };
  } catch (error) {
    unstable_rethrow(error);
    return { error: PIPELINE.connection };
  }
}
export async function saveDeal(
  _state: DealFormState,
  form: FormData,
): Promise<DealFormState> {
  const values = { ...emptyDeal };
  for (const key of Object.keys(values) as (keyof DealValues)[]) {
    const value = form.get(key);
    values[key] = typeof value === "string" ? value.trim() : "";
  }
  values.value = values.value.replace(",", ".");
  const locked = form.get("valueLocked") === "1";
  const fieldErrors = validateDeal(values);
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };
  const id = formText(form, "id");
  const result = await request(
    id ? dealPath(id) : "/deals",
    id ? "PATCH" : "POST",
    {
      title: values.title,
      ...(!locked && { value: Number(values.value) }),
      pipelineId: values.pipelineId,
      stageId: values.stageId,
      contactId: values.contactId || null,
      companyId: values.companyId || null,
      ...(values.ownerId && { ownerId: values.ownerId }),
      expectedClose: values.expectedClose
        ? values.expectedClose + "T00:00:00.000Z"
        : null,
    },
  );
  if (result.error)
    return {
      values,
      fieldErrors: {},
      feedback: { tone: "error", message: result.error },
    };
  const saved = result.data as { id: string };
  return {
    values,
    fieldErrors: {},
    savedId: saved.id,
    feedback: {
      tone: "success",
      message: id ? PIPELINE.updated : PIPELINE.created,
    },
  };
}
export async function deleteDealAction(dealId: string) {
  return request(dealPath(dealId), "DELETE");
}
/** Papelera: elimina a la vez varios negocios rechazados. */
export async function deleteRejectedAction(ids: string[]) {
  return request("/deals/rejected/delete", "POST", { ids }) as Promise<{
    error?: string;
    data?: { deleted: number };
  }>;
}
export async function dealHistoryAction(id: string) {
  return request(dealPath(id, "/history"), "GET") as Promise<{
    error?: string;
    data?: HistoryItem[];
  }>;
}
export async function saveDealItemsAction(
  dealId: string,
  rows: ItemValues[],
): Promise<{ error?: string; rowErrors?: ItemErrors }> {
  const rowErrors = validateItems(rows);
  if (rowErrors) return { rowErrors };
  return request(dealPath(dealId, "/items"), "PUT", {
    items: rows.map((row) => ({
      description: row.description.trim(),
      quantity: Number(decimal(row.quantity)),
      unitPrice: Number(decimal(row.unitPrice)),
      taxRate: Number(row.taxRate),
    })),
  });
}
const utcDay = (day: string) => day + "T00:00:00.000Z";
const optional = (form: FormData, key: string) => formText(form, key) || null;

/** Lo que falta para un cambio de etapa, sin escribir nada. */
export async function previewTransitionAction(dealId: string, to: string) {
  return request(
    dealPath(dealId, "/transition?to=" + encodeURIComponent(to)),
    "GET",
  ) as Promise<{ error?: string; data?: Preview }>;
}

/** Ruta y cuerpo del cambio: ganar, perder, rechazar y reabrir tienen la suya; el resto es mover. */
const TRANSITION_ROUTES = {
  WON: ["/win", "POST", ["closedAt", "fromStageId"]],
  LOST: ["/lose", "POST", ["lossReason", "lossDetail", "followUp", "fromStageId"]],
  REJECTED: ["/reject", "POST", ["lossReason", "lossDetail", "fromStageId"]],
  REOPEN: ["/reopen", "POST", ["reason"]],
} as const;

const between = (value: string, min: number, max: number) => value.length >= min && value.length <= max;

/**
 * El formulario del modal solo trae los campos de lo que falta, y cada uno es obligatorio: así no se guarda
 * nada a medias ni se ignora una fecha. Devuelve el primer error, con su mensaje propio.
 */
function transitionError(to: string, form: FormData): string | undefined {
  const text = (key: string) => formText(form, key);
  const has = (key: string) => form.has(key);
  const day = (key: string) => isDay(text(key));
  const today = todayEcuador();
  const errores = TRANSICION.errores;
  // Las fechas son AAAA-MM-DD: compararlas como texto respeta el orden de los días.
  const rules: [boolean, string][] = [
    [has("contactId") && !text("contactId"), errores.contacto],
    [has("ownerId") && !text("ownerId"), errores.responsable],
    [has("interactionSubject") && !between(text("interactionSubject"), 2, 160), errores.interaccion],
    [has("interactionDay") && !(day("interactionDay") && text("interactionDay") <= today), errores.interaccionFecha],
    [has("need") && !between(text("need"), 2, 2000), errores.necesidad],
    [has("nextSubject") && !between(text("nextSubject"), 2, 160), errores.actividad],
    [has("nextDay") && !(day("nextDay") && text("nextDay") >= today), errores.actividadFecha],
    [has("solution") && !between(text("solution"), 2, 2000), errores.solucion],
    [Boolean(text("budget")) && !isAmount(text("budget")), errores.presupuesto],
    [has("budget") && !text("budget") && !between(text("budgetNote"), 2, 1000), errores.presupuestoRequerido],
    [has("expectedClose") && !day("expectedClose"), errores.cierreEstimado],
    [has("validUntil") && !(day("validUntil") && text("validUntil") >= today), errores.vigencia],
    [has("sentAt") && !(day("sentAt") && text("sentAt") <= today), errores.envio],
    [has("sentAt") && text("validUntil") < text("sentAt"), errores.vigenciaEnvio],
    [has("acceptedAt") && !(day("acceptedAt") && text("acceptedAt") <= today), errores.aceptacion],
    [has("acceptedAt") && !between(text("acceptanceNote"), 2, 500), errores.evidencia],
    [has("closedAt") && !(day("closedAt") && text("closedAt") <= today), errores.cierreReal],
    [has("reason") && !between(text("reason"), 2, 500), errores.motivo],
    [Boolean(text("followUpSubject")) && !between(text("followUpSubject"), 2, 160), errores.seguimiento],
    [Boolean(text("followUpSubject")) && !(day("followUpDay") && text("followUpDay") >= today), errores.seguimientoFecha],
  ];
  const broken = rules.find(([failed]) => failed);
  if (broken) return broken[1];
  if (to !== "LOST" && to !== "REJECTED") return undefined;
  const reason = text("lossReason");
  const detail = text("lossDetail");
  const reasons: readonly string[] = to === "LOST" ? LOSS_REASONS : REJECTION_REASONS;
  if (!reasons.includes(reason))
    return to === "LOST" ? NEGOCIO.perder.motivoRequerido : NEGOCIO.rechazar.motivoRequerido;
  if ((reason === "OTHER" || detail) && !between(detail, 2, 500)) return NEGOCIO.perder.detalleRequerido;
  return undefined;
}

/** Datos que el modal completó: negocio, interacción, próxima actividad, propuesta y aceptación. */
function transitionSteps(dealId: string, form: FormData) {
  const text = (key: string) => formText(form, key);
  const deal: Record<string, unknown> = {};
  for (const key of ["contactId", "ownerId", "need", "solution", "budgetNote", "decisionMaker"])
    if (text(key)) deal[key] = text(key);
  if (text("budget")) deal.budget = Number(decimal(text("budget")));
  if (text("expectedClose")) deal.expectedClose = utcDay(text("expectedClose"));
  const steps: [string, string, unknown][] = [];
  if (Object.keys(deal).length) steps.push([dealPath(dealId), "PATCH", deal]);
  if (text("interactionSubject"))
    steps.push([
      dealPath(dealId, "/activities"),
      "POST",
      {
        type: text("interactionType"),
        subject: text("interactionSubject"),
        completedAt: utcDay(text("interactionDay")),
      },
    ]);
  if (text("nextSubject"))
    steps.push([
      dealPath(dealId, "/activities"),
      "POST",
      { type: text("nextType"), subject: text("nextSubject"), dueAt: utcDay(text("nextDay")) },
    ]);
  if (text("validUntil"))
    steps.push([
      dealPath(dealId, "/quotes"),
      "POST",
      { validUntil: utcDay(text("validUntil")), ...(text("sentAt") && { sentAt: utcDay(text("sentAt")) }) },
    ]);
  if (text("acceptedAt") && text("quoteId"))
    steps.push([
      dealPath(dealId, "/quotes/" + encodeURIComponent(text("quoteId")) + "/accept"),
      "POST",
      { acceptedAt: utcDay(text("acceptedAt")), acceptanceNote: text("acceptanceNote") },
    ]);
  return steps;
}

/**
 * Valida y guarda lo que el modal completó, sin cambiar de etapa: es «Guardar e ir a la ficha», para lo que
 * solo se completa allí. Corta en el primer error; lo guardado antes queda, porque son datos reales.
 */
export async function saveTransitionAction(
  dealId: string,
  to: string,
  form: FormData,
): Promise<{ error?: string; done?: true }> {
  const error = transitionError(to, form);
  if (error) return { error };
  for (const [path, method, body] of transitionSteps(dealId, form)) {
    const result = await request(path, method, body);
    if (result.error) return { error: result.error };
  }
  return { done: true };
}

/** Guarda lo que el modal completó y termina con el cambio de etapa. */
export async function completeTransitionAction(
  dealId: string,
  to: string,
  fromStageId: string,
  form: FormData,
): Promise<{ error?: string; pending?: Pending[]; done?: true }> {
  const saved = await saveTransitionAction(dealId, to, form);
  if (saved.error) return saved;
  const text = (key: string) => formText(form, key);
  const values: Record<string, unknown> = {
    fromStageId,
    reason: text("reason") || undefined,
    closedAt: text("closedAt") ? utcDay(text("closedAt")) : undefined,
    lossReason: text("lossReason") || undefined,
    lossDetail: text("lossDetail") || undefined,
    followUp: text("followUpSubject")
      ? { type: text("followUpType"), subject: text("followUpSubject"), dueAt: utcDay(text("followUpDay")) }
      : undefined,
  };
  const route = TRANSITION_ROUTES[to as keyof typeof TRANSITION_ROUTES];
  const [rest, method, keys] = route ?? ["/move", "PATCH", ["fromStageId", "reason", "closedAt"]];
  const body = Object.fromEntries(
    keys.filter((key) => values[key] !== undefined).map((key) => [key, values[key]]),
  );
  const result = await request(dealPath(dealId, rest), method, route ? body : { stageId: to, ...body });
  return result.error ? { error: result.error, pending: result.pending } : { done: true };
}

/** "Ver más": la página siguiente de una columna del tablero. */
export async function loadColumnAction(pipelineId: string, column: string, page: number) {
  const query = new URLSearchParams({ pipelineId, column, page: String(page) });
  return request("/deals/board?" + query.toString(), "GET") as Promise<{
    error?: string;
    data?: { deals: Deal[] };
  }>;
}

/** Calificación del negocio en la ficha: un campo vacío se borra (null). */
export async function qualifyDealAction(
  dealId: string,
  form: FormData,
): Promise<{ error?: string; fieldErrors?: { budget?: string } }> {
  const budget = formText(form, "budget");
  if (budget && !isAmount(budget)) return { fieldErrors: { budget: TRANSICION.errores.presupuesto } };
  return request(dealPath(dealId), "PATCH", {
    need: optional(form, "need"),
    solution: optional(form, "solution"),
    budget: budget ? Number(decimal(budget)) : null,
    budgetNote: optional(form, "budgetNote"),
    decisionMaker: optional(form, "decisionMaker"),
  });
}

export async function createQuoteAction(dealId: string, form: FormData) {
  const validUntil = formText(form, "validUntil");
  const sentAt = formText(form, "sentAt");
  if (!isDay(validUntil) || (sentAt && !isDay(sentAt))) return { error: PIPELINE.dateInvalid };
  return request(dealPath(dealId, "/quotes"), "POST", {
    validUntil: utcDay(validUntil),
    ...(sentAt && { sentAt: utcDay(sentAt) }),
  });
}

export async function acceptQuoteAction(dealId: string, quoteId: string, form: FormData) {
  const acceptedAt = formText(form, "acceptedAt");
  const acceptanceNote = formText(form, "acceptanceNote");
  if (!isDay(acceptedAt)) return { error: PIPELINE.dateInvalid };
  if (acceptanceNote.length < 2 || acceptanceNote.length > 500) return { error: TRANSICION.errores.evidencia };
  return request(dealPath(dealId, "/quotes/" + encodeURIComponent(quoteId) + "/accept"), "POST", {
    acceptedAt: utcDay(acceptedAt),
    acceptanceNote,
  });
}
export async function createActivityAction(
  dealId: string,
  _state: ActivityFormState,
  form: FormData,
): Promise<ActivityFormState> {
  const values = { ...emptyActivity };
  for (const key of Object.keys(values) as (keyof ActivityValues)[])
    values[key] = formText(form, key);
  const texto = NEGOCIO.actividad;
  const fieldErrors: ActivityFormState["fieldErrors"] = {};
  if (!(ACTIVITY_TYPES as readonly string[]).includes(values.type))
    fieldErrors.type = texto.tipoRequerido;
  if (values.subject.length < 2 || values.subject.length > 160)
    fieldErrors.subject = texto.asuntoRequerido;
  if (values.dueAt && !isDay(values.dueAt))
    fieldErrors.dueAt = PIPELINE.dateInvalid;
  if (values.description.length > 1000)
    fieldErrors.description = texto.notaLarga;
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };
  // "Ya se realizó": la fecha es la de la actividad hecha (hoy si se deja vacía), no un vencimiento.
  const day = values.dueAt && values.dueAt + "T00:00:00.000Z";
  const result = await request(dealPath(dealId, "/activities"), "POST", {
    type: values.type,
    subject: values.subject,
    ...(values.done
      ? { completedAt: day || utcDay(todayEcuador()) }
      : day && { dueAt: day }),
    ...(values.description && { description: values.description }),
  });
  if (result.error)
    return {
      values,
      fieldErrors: {},
      feedback: { tone: "error", message: result.error },
    };
  return {
    values: emptyActivity,
    fieldErrors: {},
    feedback: { tone: "success", message: texto.registrada },
  };
}
export async function completeActivityAction(
  dealId: string,
  activityId: string,
) {
  return request(
    dealPath(
      dealId,
      "/activities/" + encodeURIComponent(activityId) + "/complete",
    ),
    "PATCH",
  );
}

type ConfigurationOperation =
  | "createPipeline"
  | "updatePipeline"
  | "deletePipeline"
  | "createStage"
  | "updateStage"
  | "deleteStage";

function configurationRoute(operation: ConfigurationOperation, id: string) {
  const encoded = encodeURIComponent(id);
  if (operation === "createPipeline") return "/pipelines";
  if (operation === "createStage") return "/pipelines/" + encoded + "/stages";
  const resource = operation.endsWith("Stage") ? "/stages/" : "/pipelines/";
  return resource + encoded;
}

export async function configurePipelineAction(
  operation: ConfigurationOperation,
  id: string,
  form: FormData,
) {
  const route = configurationRoute(operation, id);
  if (operation.startsWith("delete")) return request(route, "DELETE");
  const name = formText(form, "name");
  if (name.length < 2)
    return { error: "Ingresa un nombre de al menos dos caracteres." };
  const stage = operation.endsWith("Stage");
  const body = stage
    ? {
        name,
        position: Number(formText(form, "position")),
        probability: Number(formText(form, "probability")),
        color: formText(form, "color") || "#2f6f8f",
        requirements: form.getAll("requirements").filter((code) => typeof code === "string"),
      }
    : { name, ...(form.get("isDefault") === "true" && { isDefault: true }) };
  if (
    stage &&
    (!Number.isInteger(body.position) || !Number.isInteger(body.probability))
  )
    return { error: "La posicion y la probabilidad deben ser enteros." };
  const method = operation.startsWith("create") ? "POST" : "PATCH";
  return request(route, method, body);
}
