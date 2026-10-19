"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import { ACTIVITY_TYPES, LOSS_REASONS } from "@wave/shared";
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

/** Ruta y cuerpo del cambio: ganar, perder y reabrir tienen la suya; el resto es mover. */
const TRANSITION_ROUTES = {
  WON: ["/win", "POST", ["closedAt", "fromStageId"]],
  LOST: ["/lose", "POST", ["lossReason", "lossDetail", "fromStageId"]],
  REOPEN: ["/reopen", "POST", ["reason"]],
} as const;

function transitionError(to: string, form: FormData): string | undefined {
  const text = (key: string) => formText(form, key);
  for (const key of ["expectedClose", "interactionDay", "nextDay", "validUntil", "sentAt", "acceptedAt", "closedAt"])
    if (text(key) && !isDay(text(key))) return PIPELINE.dateInvalid;
  if (text("budget") && !isAmount(text("budget"))) return TRANSICION.errores.presupuesto;
  if (text("reason") && (text("reason").length < 2 || text("reason").length > 500))
    return TRANSICION.errores.motivo;
  if (text("acceptedAt") && (text("acceptanceNote").length < 2 || text("acceptanceNote").length > 500))
    return TRANSICION.errores.evidencia;
  if (to !== "LOST") return undefined;
  const reason = text("lossReason");
  const detail = text("lossDetail");
  if (!(LOSS_REASONS as readonly string[]).includes(reason)) return NEGOCIO.perder.motivoRequerido;
  if ((reason === "OTHER" || detail) && (detail.length < 2 || detail.length > 500))
    return NEGOCIO.perder.detalleRequerido;
  return undefined;
}

/**
 * Guarda lo que el modal completó (datos del negocio, interacción, próxima actividad, propuesta y aceptación)
 * y termina con el cambio de etapa. Corta en el primer error; lo guardado antes queda, porque son datos reales.
 */
export async function completeTransitionAction(
  dealId: string,
  to: string,
  fromStageId: string,
  form: FormData,
): Promise<{ error?: string; pending?: Pending[]; done?: true }> {
  const error = transitionError(to, form);
  if (error) return { error };
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
        completedAt: utcDay(text("interactionDay") || todayEcuador()),
      },
    ]);
  if (text("nextSubject"))
    steps.push([
      dealPath(dealId, "/activities"),
      "POST",
      { type: text("nextType"), subject: text("nextSubject"), dueAt: utcDay(text("nextDay") || todayEcuador()) },
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
  for (const [path, method, body] of steps) {
    const result = await request(path, method, body);
    if (result.error) return { error: result.error };
  }
  const values: Record<string, string | undefined> = {
    fromStageId,
    reason: text("reason") || undefined,
    closedAt: text("closedAt") ? utcDay(text("closedAt")) : undefined,
    lossReason: text("lossReason") || undefined,
    lossDetail: text("lossDetail") || undefined,
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
