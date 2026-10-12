"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import { ACTIVITY_TYPES, LOSS_REASONS } from "@wave/shared";
import { NEGOCIO, PIPELINE } from "@/content/pipeline";
import {
  decimal,
  isDay,
  validateDeal,
  validateItems,
} from "./deal-validation";
import {
  emptyActivity,
  emptyDeal,
  type ActivityFormState,
  type ActivityValues,
  type DealFormState,
  type DealValues,
  type HistoryItem,
  type ItemErrors,
  type ItemValues,
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
): Promise<{ error?: string; data?: unknown }> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) return { error: await apiError(response) };
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
export async function moveDealAction(dealId: string, stageId: string) {
  return request(dealPath(dealId, "/move"), "PATCH", { stageId });
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
export async function winDealAction(dealId: string, day: string) {
  if (!isDay(day)) return { error: PIPELINE.dateInvalid };
  return request(dealPath(dealId, "/win"), "POST", {
    closedAt: day + "T00:00:00.000Z",
  });
}
export async function loseDealAction(
  dealId: string,
  lossReason: string,
  lossDetail: string,
): Promise<{
  error?: string;
  fieldErrors?: { lossReason?: string; lossDetail?: string };
}> {
  const detail = lossDetail.trim();
  const texto = NEGOCIO.perder;
  if (!(LOSS_REASONS as readonly string[]).includes(lossReason))
    return { fieldErrors: { lossReason: texto.motivoRequerido } };
  const needsDetail = lossReason === "OTHER" || detail.length > 0;
  if (needsDetail && (detail.length < 2 || detail.length > 500))
    return { fieldErrors: { lossDetail: texto.detalleRequerido } };
  return request(dealPath(dealId, "/lose"), "POST", {
    lossReason,
    ...(detail && { lossDetail: detail }),
  });
}
export async function reopenDealAction(dealId: string) {
  return request(dealPath(dealId, "/reopen"), "POST");
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
  const result = await request(dealPath(dealId, "/activities"), "POST", {
    type: values.type,
    subject: values.subject,
    ...(values.dueAt && { dueAt: values.dueAt + "T00:00:00.000Z" }),
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
